import { Payment } from '../models/Payment.js';
import { Registration } from '../models/Registration.js';
import { User } from '../models/User.js';
import { config } from '../config/env.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../utils/razorpay.js';
import { emailService } from './email.service.js';

export const paymentService = {
  /**
   * Create / Prepare Payment Order (and record into payments table)
   */
  async createPaymentOrder(userId, { registrationId, amount: requestedAmount, amountInPaise: requestedPaise } = {}) {
    let reg;
    if (registrationId) {
      reg = await Registration.findById(registrationId);
    }
    if (!reg) {
      reg = await Registration.findByUserId(userId);
    }

    if (!reg) {
      const error = new Error('No registration found to initialize payment.');
      error.statusCode = 404;
      throw error;
    }

    if (reg.payment_status === 'paid') {
      const error = new Error('This registration has already been paid and confirmed.');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findById(userId);

    let subtotal = parseFloat(reg.subtotal || 0);
    let gstRate = parseFloat(reg.gst_rate || 18.00);
    let gstAmount = parseFloat(reg.gst_amount || 0);
    let grandTotal = parseFloat(reg.grand_total || 0);

    if (grandTotal === 0 && (parseFloat(reg.category_price || 0) > 0 || parseFloat(reg.accompanying_total || 0) > 0)) {
      const catPrice = parseFloat(reg.category_price || 0);
      const accTotal = parseFloat(reg.accompanying_total || 0);
      subtotal = catPrice + accTotal;
      gstAmount = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
      grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));

      await Registration.updateById(reg.id, {
        subtotal,
        gst_rate: gstRate,
        gst_amount: gstAmount,
        grand_total: grandTotal
      });
    }

    // Facilitation charge (4.5%)
    const facilitationCharge = parseFloat((grandTotal * 0.045).toFixed(2));
    const totalWithFacilitation = parseFloat((grandTotal + facilitationCharge).toFixed(2));

    // Determine final amount to charge (prefer frontend sent amount or fallback to calculated totalWithFacilitation)
    let finalAmountInPaise = Math.round(totalWithFacilitation * 100);
    if (requestedPaise && parseInt(requestedPaise, 10) > 0) {
      finalAmountInPaise = Math.round(parseInt(requestedPaise, 10));
    } else if (requestedAmount && parseFloat(requestedAmount) > 0) {
      const parsed = parseFloat(requestedAmount);
      if (parsed > 10000) {
        finalAmountInPaise = Math.round(parsed);
      } else {
        finalAmountInPaise = Math.round(parsed * 100);
      }
    }

    const finalAmountInRs = parseFloat((finalAmountInPaise / 100).toFixed(2));

    // Create official Razorpay Order
    let razorpayOrder = null;
    try {
      razorpayOrder = await createRazorpayOrder({
        amountInPaise: finalAmountInPaise,
        currency: 'INR',
        receipt: reg.registration_code || `REG_${reg.id}`,
        notes: {
          registrationId: reg.id,
          registrationCode: reg.registration_code || '',
          categoryName: reg.category_name || ''
        }
      });
    } catch (rzpErr) {
      console.warn('⚠️ Razorpay order creation error:', rzpErr.message);
    }

    const orderId = razorpayOrder?.id || `ORDER_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Record order in payments table
    let paymentRecord = null;
    try {
      paymentRecord = await Payment.create({
        registration_id: reg.id,
        user_id: userId,
        razorpay_order_id: orderId,
        amount: finalAmountInRs,
        currency: 'INR',
        status: 'created',
        payment_method: 'Razorpay (PAGE WORLDWIDE)',
        notes: `Payment initialization for registration ${reg.registration_code}`
      });
    } catch (dbErr) {
      console.warn('Could not record initial payment record in DB:', dbErr.message);
    }

    return {
      keyId: config.RAZORPAY.KEY_ID || process.env.RAZORPAY_KEY_ID || '',
      orderId,
      paymentId: paymentRecord?.id || null,
      registrationId: reg.id,
      registrationCode: reg.registration_code,
      amount: finalAmountInRs,
      currency: 'INR',
      amountInPaise: finalAmountInPaise,
      categoryName: reg.category_name,
      accompanyingCount: reg.accompanying_count,
      customer: {
        id: userId,
        name: reg.full_name || user?.name || '',
        email: reg.email || user?.email || '',
        phone: reg.phone || user?.phone || ''
      },
      breakdown: {
        categoryPrice: parseFloat(reg.category_price || 0),
        accompanyingTotal: parseFloat(reg.accompanying_total || 0),
        subtotal,
        gstRate,
        gstAmount,
        grandTotal,
        facilitationCharge,
        totalPayable: finalAmountInRs
      }
    };
  },

  /**
   * Process & Confirm Payment (updates Registration, Invoices & Payments DB, Sends Emails)
   */
  async processPayment(userId, { registrationId, paymentMethod, transactionId, paymentGateway, razorpayOrderId, razorpayPaymentId, razorpaySignature } = {}) {
    let reg;
    if (registrationId) {
      reg = await Registration.findById(registrationId);
    }
    if (!reg) {
      reg = await Registration.findByUserId(userId);
    }

    if (!reg) {
      const error = new Error('No registration record found to pay.');
      error.statusCode = 404;
      throw error;
    }

    const user = await User.findById(userId || reg.user_id);

    let subtotal = parseFloat(reg.subtotal || 0);
    let gstRate = parseFloat(reg.gst_rate || 18.00);
    let gstAmount = parseFloat(reg.gst_amount || 0);
    let grandTotal = parseFloat(reg.grand_total || 0);

    if (grandTotal === 0 && (parseFloat(reg.category_price || 0) > 0 || parseFloat(reg.accompanying_total || 0) > 0)) {
      const catPrice = parseFloat(reg.category_price || 0);
      const accTotal = parseFloat(reg.accompanying_total || 0);
      subtotal = catPrice + accTotal;
      gstAmount = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
      grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));
    }

    const facilitationCharge = parseFloat((grandTotal * 0.045).toFixed(2));
    const totalPayable = parseFloat((grandTotal + facilitationCharge).toFixed(2));

    const txnId = razorpayPaymentId || transactionId || `PAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const method = paymentMethod || paymentGateway || 'Razorpay (PAGE WORLDWIDE)';

    // 1. Confirm registration in DB
    const updatedReg = await Registration.updateById(reg.id, {
      payment_method: method,
      payment_status: 'paid',
      transaction_id: txnId,
      paid_at: new Date(),
      status: 'confirmed',
      subtotal,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      grand_total: grandTotal
    });

    // 2. Mark existing invoices paid
    await Registration.updateInvoicesToPaid(reg.id);

    // 3. Create official tax receipt invoice
    const receiptNum = `RCPT-${new Date().getFullYear()}-${String(reg.id).padStart(5, '0')}`;
    await Registration.createInvoice({
      invoice_number: receiptNum,
      registration_id: reg.id,
      user_id: userId || reg.user_id,
      invoice_type: 'receipt',
      title: 'Official Receipt & Tax Invoice - SPCTT 2027',
      description: `Payment confirmed for ${reg.registration_code} via ${method} (Txn: ${txnId})`,
      quantity: 1,
      rate: subtotal,
      amount: subtotal,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      total_amount: grandTotal,
      status: 'paid'
    });

    // 4. Update or create record in payments table
    let paymentRecord = null;
    try {
      if (razorpayOrderId) {
        paymentRecord = await Payment.updateByOrderId(razorpayOrderId, {
          registration_id: reg.id,
          razorpay_payment_id: txnId,
          razorpay_signature: razorpaySignature || null,
          status: 'paid',
          amount: totalPayable,
          payment_method: method,
          notes: `Payment completed for ${reg.registration_code}`
        });
      }

      if (!paymentRecord) {
        paymentRecord = await Payment.create({
          registration_id: reg.id,
          user_id: userId || reg.user_id,
          razorpay_order_id: razorpayOrderId || null,
          razorpay_payment_id: txnId,
          razorpay_signature: razorpaySignature || null,
          amount: totalPayable,
          currency: 'INR',
          status: 'paid',
          payment_method: method,
          notes: `Payment completed for ${reg.registration_code}`
        });
      }
    } catch (payDbErr) {
      console.warn('Could not record payment in DB payments table:', payDbErr.message);
    }

    const allInvoices = await Registration.getInvoicesByRegistrationId(reg.id);

    // 5. Send Payment Success Emails to BOTH User & Admin in background
    try {
      await emailService.sendPaymentSuccessEmails({
        registration: updatedReg || reg,
        payment: paymentRecord,
        user,
        invoices: allInvoices
      });
    } catch (emailErr) {
      console.error('⚠️ Could not dispatch payment success emails:', emailErr.message);
    }

    return {
      registration: updatedReg,
      transactionId: txnId,
      paymentStatus: 'paid',
      paymentMethod: method,
      paymentRecord,
      invoices: allInvoices
    };
  },

  /**
   * Verify Payment Transaction Signature & Process
   */
  async verifyPayment(userId, { registrationId, transactionId, razorpayPaymentId, razorpayOrderId, razorpaySignature, paymentMethod } = {}) {
    let reg;
    if (registrationId) {
      reg = await Registration.findById(registrationId);
    }
    if (!reg) {
      reg = await Registration.findByUserId(userId);
    }

    if (!reg) {
      const error = new Error('Registration not found.');
      error.statusCode = 404;
      throw error;
    }

    const txnId = razorpayPaymentId || transactionId;
    const orderId = razorpayOrderId;

    // Verify signature if signature & orderId & paymentId provided
    if (orderId && txnId && razorpaySignature) {
      const isValid = verifyRazorpaySignature({
        order_id: orderId,
        payment_id: txnId,
        signature: razorpaySignature
      });

      if (!isValid) {
        console.warn(`❌ Razorpay signature verification failed for Order: ${orderId}, Payment: ${txnId}`);
        // Record failure in DB and send failure notification
        await this.recordPaymentFailure(userId, {
          registrationId: reg.id,
          orderId,
          paymentId: txnId,
          failureReason: 'Razorpay signature verification failed (Signature mismatch)',
          paymentMethod: paymentMethod || 'Razorpay (PAGE WORLDWIDE)'
        });

        const error = new Error('Invalid payment signature verification failed.');
        error.statusCode = 400;
        throw error;
      }
    }

    const finalTxnId = txnId || `PAY_VERIFIED_${Date.now()}`;

    // Process payment and send confirmation emails
    const result = await this.processPayment(userId, {
      registrationId: reg.id,
      paymentMethod: paymentMethod || 'Razorpay (PAGE WORLDWIDE)',
      transactionId: finalTxnId,
      razorpayOrderId: orderId,
      razorpayPaymentId: finalTxnId,
      razorpaySignature
    });

    return {
      verified: true,
      transactionId: finalTxnId,
      orderId: orderId || null,
      paymentStatus: result.registration.payment_status,
      registration: result.registration,
      payment: result.paymentRecord,
      invoices: result.invoices
    };
  },

  /**
   * Record Payment Failure in Database and Dispatch Notification Emails (To Admin & User)
   */
  async recordPaymentFailure(userId, {
    registrationId,
    orderId,
    paymentId,
    errorCode,
    errorDescription,
    errorReason,
    amount,
    paymentMethod,
    rawResponse
  } = {}) {
    let reg = null;
    if (registrationId) {
      reg = await Registration.findById(registrationId);
    }
    if (!reg && userId) {
      reg = await Registration.findByUserId(userId);
    }

    const user = userId ? await User.findById(userId) : (reg ? await User.findById(reg.user_id) : null);
    const failureReason = errorReason || errorDescription || (errorCode ? `Gateway Error: ${errorCode}` : 'Payment transaction failed / user cancelled / declined by bank');
    const method = paymentMethod || 'Razorpay (PAGE WORLDWIDE)';
    const grandTotal = reg ? parseFloat(reg.grand_total || 0) : 0;
    const finalAmount = amount ? parseFloat(amount) : (grandTotal > 0 ? parseFloat((grandTotal * 1.045).toFixed(2)) : 0);

    console.log(`⚠️ Recording Payment Failure in DB: Reg #${reg?.id || 'N/A'}, Order: ${orderId || 'N/A'}, PaymentId: ${paymentId || 'N/A'}, Reason: ${failureReason}`);

    // 1. Update or create record in payments table with status = 'failed'
    let paymentRecord = null;
    try {
      if (orderId) {
        paymentRecord = await Payment.updateByOrderId(orderId, {
          registration_id: reg?.id || null,
          razorpay_payment_id: paymentId || null,
          status: 'failed',
          amount: finalAmount,
          payment_method: method,
          notes: `Payment failed: ${failureReason}`,
          raw_response: rawResponse || { errorCode, errorDescription, errorReason }
        });
      }

      if (!paymentRecord) {
        paymentRecord = await Payment.create({
          registration_id: reg?.id || null,
          user_id: userId || reg?.user_id || 0,
          razorpay_order_id: orderId || null,
          razorpay_payment_id: paymentId || null,
          amount: finalAmount,
          currency: 'INR',
          status: 'failed',
          payment_method: method,
          notes: `Payment failed: ${failureReason}`,
          raw_response: rawResponse || { errorCode, errorDescription, errorReason }
        });
      }
    } catch (payDbErr) {
      console.warn('Could not record failed payment in DB:', payDbErr.message);
    }

    // 2. Update Registration payment_status to 'failed' if not already paid
    if (reg && reg.payment_status !== 'paid') {
      try {
        await Registration.updateById(reg.id, {
          payment_status: 'failed',
          payment_method: method
        });
      } catch (regDbErr) {
        console.warn('Could not update registration status to failed:', regDbErr.message);
      }
    }

    // 3. Dispatch Payment Failure Alert Emails to BOTH User & Admin
    try {
      await emailService.sendPaymentFailedEmails({
        registration: reg,
        payment: paymentRecord,
        user,
        failureReason,
        orderId,
        paymentId,
        attemptedAmount: finalAmount
      });
    } catch (emailErr) {
      console.error('⚠️ Could not dispatch payment failure emails:', emailErr.message);
    }

    return {
      success: true,
      status: 'failed',
      failureReason,
      paymentRecord
    };
  },

  /**
   * Handle Webhook from Payment Gateway
   */
  async handleWebhook(body, signature, rawBody) {
    const event = body?.event || 'unknown';
    const payload = body?.payload?.payment?.entity || body?.payload?.order?.entity || {};
    const orderId = payload?.order_id || payload?.id;
    const paymentId = payload?.id;
    const amount = payload?.amount ? parseFloat(payload.amount) / 100 : 0;
    const method = payload?.method ? `Razorpay (${payload.method.toUpperCase()})` : 'Razorpay (PAGE WORLDWIDE)';
    const errorDesc = payload?.error_description || payload?.error_reason || '';

    console.log(`🔔 Webhook received: Event='${event}', OrderID='${orderId}', PaymentID='${paymentId}'`);

    if (event === 'payment.captured' || event === 'order.paid') {
      let existingPayment = null;
      if (orderId) {
        existingPayment = await Payment.findByOrderId(orderId);
      }
      if (!existingPayment && paymentId) {
        existingPayment = await Payment.findByPaymentId(paymentId);
      }

      if (existingPayment && existingPayment.registration_id) {
        const reg = await Registration.findById(existingPayment.registration_id);
        if (reg) {
          await this.processPayment(existingPayment.user_id || reg.user_id, {
            registrationId: reg.id,
            paymentMethod: method,
            transactionId: paymentId,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId
          });
        }
      } else if (orderId) {
        await Payment.updateByOrderId(orderId, {
          razorpay_payment_id: paymentId,
          status: 'paid',
          webhook_event: event,
          raw_response: body
        });
      }
    } else if (event === 'payment.failed') {
      let existingPayment = null;
      if (orderId) {
        existingPayment = await Payment.findByOrderId(orderId);
      }

      const regId = existingPayment?.registration_id || payload?.notes?.registrationId;
      const userId = existingPayment?.user_id || payload?.notes?.userId;

      await this.recordPaymentFailure(userId, {
        registrationId: regId,
        orderId,
        paymentId,
        errorCode: payload?.error_code,
        errorDescription: errorDesc,
        errorReason: errorDesc || 'Payment failed on gateway webhook',
        amount,
        paymentMethod: method,
        rawResponse: body
      });
    } else if (event === 'payment.refunded' || event === 'refund.processed' || event === 'refund.created') {
      let existingPayment = null;
      if (orderId) {
        existingPayment = await Payment.findByOrderId(orderId);
      }
      if (!existingPayment && paymentId) {
        existingPayment = await Payment.findByPaymentId(paymentId);
      }

      const regId = existingPayment?.registration_id || payload?.notes?.registrationId;
      const userId = existingPayment?.user_id || payload?.notes?.userId;
      const reg = regId ? await Registration.findById(regId) : (userId ? await Registration.findByUserId(userId) : null);
      const user = userId ? await User.findById(userId) : (reg ? await User.findById(reg.user_id) : null);

      if (reg) {
        try {
          await Registration.updateById(reg.id, {
            payment_status: 'refunded'
          });
        } catch (rErr) {
          console.warn('Could not update registration status to refunded:', rErr.message);
        }
      }

      if (existingPayment) {
        try {
          await Payment.updateById(existingPayment.id, {
            status: 'refunded',
            notes: `Refund processed via Razorpay Webhook (${event})`
          });
        } catch (pErr) {
          console.warn('Could not update payment status to refunded:', pErr.message);
        }
      }

      try {
        await emailService.sendPaymentRefundedEmails({
          registration: reg,
          payment: existingPayment,
          user,
          refundAmount: amount || (reg ? parseFloat(reg.grand_total || 0) : 0),
          refundReason: `Refund processed by Payment Gateway (${event})`,
          transactionId: paymentId,
          orderId
        });
      } catch (emErr) {
        console.error('Error dispatching webhook refund email:', emErr.message);
      }
    }

    return { received: true, event };
  },

  /**
   * Get Payment History for a specific User from Database
   */
  async getPaymentHistory(userId) {
    return Payment.getHistoryByUserId(userId);
  },

  /**
   * Get Payment History by Registration ID
   */
  async getPaymentHistoryByRegistrationId(registrationId, userId, role) {
    const reg = await Registration.findById(registrationId);
    if (!reg) {
      const error = new Error('Registration record not found.');
      error.statusCode = 404;
      throw error;
    }

    if (role !== 'admin' && reg.user_id !== userId) {
      const error = new Error('Access denied to view this registration payment history.');
      error.statusCode = 403;
      throw error;
    }

    const payments = await Payment.findAllByRegistrationId(registrationId);
    const invoices = await Registration.getInvoicesByRegistrationId(registrationId);

    return {
      registrationId: reg.id,
      registrationCode: reg.registration_code,
      fullName: reg.full_name,
      categoryName: reg.category_name,
      paymentStatus: reg.payment_status,
      paymentMethod: reg.payment_method,
      transactionId: reg.transaction_id,
      paidAt: reg.paid_at,
      grandTotal: parseFloat(reg.grand_total || 0),
      payments,
      invoices
    };
  },

  /**
   * Get All Payment Transactions with Filters and Pagination (for Admin / System view)
   */
  async getAllPaymentHistory({ page = 1, limit = 20, status, search, userId, registrationId } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const [payments, totalCount, stats] = await Promise.all([
      Payment.findAll({ status, search, userId, registrationId, limit: limitNum, offset }),
      Payment.countAll({ status, search, userId, registrationId }),
      Payment.getStats()
    ]);

    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    return {
      payments,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      stats
    };
  },

  /**
   * Get Single Payment Transaction by Payment ID
   */
  async getPaymentById(paymentId, userId, role) {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      const error = new Error('Payment record not found.');
      error.statusCode = 404;
      throw error;
    }

    if (role !== 'admin' && payment.user_id !== userId) {
      const error = new Error('Access denied to view this payment record.');
      error.statusCode = 403;
      throw error;
    }

    return payment;
  },

  /**
   * Get Current Payment Status
   */
  async getPaymentStatus(userId) {
    const reg = await Registration.findByUserId(userId);
    if (!reg) {
      return {
        hasRegistration: false,
        paymentStatus: 'none',
        registration: null,
        invoices: []
      };
    }

    const invoices = await Registration.getInvoicesByRegistrationId(reg.id);
    const payments = await Payment.findAllByRegistrationId(reg.id);

    return {
      hasRegistration: true,
      registrationId: reg.id,
      registrationCode: reg.registration_code,
      paymentStatus: reg.payment_status,
      paymentMethod: reg.payment_method,
      transactionId: reg.transaction_id,
      paidAt: reg.paid_at,
      grandTotal: parseFloat(reg.grand_total || 0),
      registration: reg,
      payments,
      invoices
    };
  },

  /**
   * Get Payment Status by Registration ID (for Admin & User)
   */
  async getPaymentStatusByRegistrationId(registrationId, userId, role) {
    const reg = await Registration.findById(registrationId);
    if (!reg) {
      const error = new Error('Registration record not found.');
      error.statusCode = 404;
      throw error;
    }

    if (role !== 'admin' && reg.user_id !== userId) {
      const error = new Error('Access denied to view this registration payment status.');
      error.statusCode = 403;
      throw error;
    }

    const invoices = await Registration.getInvoicesByRegistrationId(reg.id);
    const payments = await Payment.findAllByRegistrationId(reg.id);

    return {
      registrationId: reg.id,
      registrationCode: reg.registration_code,
      fullName: reg.full_name,
      email: reg.email,
      phone: reg.phone,
      organization: reg.organization,
      categoryName: reg.category_name,
      paymentStatus: reg.payment_status,
      paymentMethod: reg.payment_method,
      transactionId: reg.transaction_id,
      paidAt: reg.paid_at,
      status: reg.status,
      breakdown: {
        categoryPrice: parseFloat(reg.category_price || 0),
        accompanyingTotal: parseFloat(reg.accompanying_total || 0),
        subtotal: parseFloat(reg.subtotal || 0),
        gstRate: parseFloat(reg.gst_rate || 18.00),
        gstAmount: parseFloat(reg.gst_amount || 0),
        grandTotal: parseFloat(reg.grand_total || 0),
        facilitationCharges: parseFloat((parseFloat(reg.grand_total || 0) * 0.045).toFixed(2)),
        totalPayable: parseFloat((parseFloat(reg.grand_total || 0) * 1.045).toFixed(2))
      },
      payments,
      invoices,
      registration: reg
    };
  },

  /**
   * Get Payment Breakdown for Registration
   */
  async getPaymentDetails(registrationId, userId, role) {
    return this.getPaymentStatusByRegistrationId(registrationId, userId, role);
  }
};

export default paymentService;
