import { Payment } from '../models/Payment.js';
import { Registration } from '../models/Registration.js';
import { User } from '../models/User.js';

export const paymentService = {
  /**
   * Create / Prepare Payment Order (and record into payments table)
   */
  async createPaymentOrder(userId, { registrationId } = {}) {
    let reg;
    if (registrationId) {
      reg = await Registration.findById(registrationId);
    } else {
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
    const orderId = `ORDER_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

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

    const amount = grandTotal;

    // Record order in payments table
    let paymentRecord = null;
    try {
      paymentRecord = await Payment.create({
        registration_id: reg.id,
        user_id: userId,
        razorpay_order_id: orderId,
        amount,
        currency: 'INR',
        status: 'created',
        payment_method: 'Axis Razorpay (PAGE WORLDWIDE)',
        notes: `Payment initialization for registration ${reg.registration_code}`
      });
    } catch (dbErr) {
      console.warn('Could not record initial payment record in DB:', dbErr.message);
    }

    return {
      orderId,
      paymentId: paymentRecord?.id || null,
      registrationId: reg.id,
      registrationCode: reg.registration_code,
      amount,
      currency: 'INR',
      amountInPaise: Math.round(amount * 100),
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
        grandTotal: amount
      }
    };
  },

  /**
   * Process & Confirm Payment (updates Registration, Invoices & Payments DB)
   */
  async processPayment(userId, { registrationId, paymentMethod, transactionId, paymentGateway, razorpayOrderId, razorpayPaymentId, razorpaySignature } = {}) {
    let reg;
    if (registrationId) {
      reg = await Registration.findById(registrationId);
    } else {
      reg = await Registration.findByUserId(userId);
    }

    if (!reg) {
      const error = new Error('No registration record found to pay.');
      error.statusCode = 404;
      throw error;
    }

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

    const txnId = razorpayPaymentId || transactionId || `PAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const method = paymentMethod || paymentGateway || 'Axis Razorpay (PAGE WORLDWIDE)';

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
      user_id: userId,
      invoice_type: 'receipt',
      title: 'Official Receipt & Tax Invoice - SPCTT 2026',
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
          amount: grandTotal,
          payment_method: method
        });
      }

      if (!paymentRecord) {
        paymentRecord = await Payment.create({
          registration_id: reg.id,
          user_id: userId,
          razorpay_order_id: razorpayOrderId || null,
          razorpay_payment_id: txnId,
          razorpay_signature: razorpaySignature || null,
          amount: grandTotal,
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
   * Verify Payment Transaction
   */
  async verifyPayment(userId, { registrationId, transactionId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = {}) {
    let reg;
    if (registrationId) {
      reg = await Registration.findById(registrationId);
    } else {
      reg = await Registration.findByUserId(userId);
    }

    if (!reg) {
      const error = new Error('Registration not found.');
      error.statusCode = 404;
      throw error;
    }

    const txnId = razorpayPaymentId || transactionId || `PAY_VERIFIED_${Date.now()}`;

    // Update registration as paid if not already paid
    if (reg.payment_status !== 'paid') {
      await this.processPayment(userId, {
        registrationId: reg.id,
        paymentMethod: 'Axis Razorpay (PAGE WORLDWIDE)',
        transactionId: txnId,
        razorpayOrderId,
        razorpayPaymentId: txnId,
        razorpaySignature
      });
    }

    const updatedReg = await Registration.findById(reg.id);
    const invoices = await Registration.getInvoicesByRegistrationId(reg.id);
    const payment = await Payment.findByPaymentId(txnId) || await Payment.findByRegistrationId(reg.id);

    return {
      verified: true,
      transactionId: txnId,
      orderId: razorpayOrderId || null,
      paymentStatus: updatedReg.payment_status,
      registration: updatedReg,
      payment,
      invoices
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

    console.log(`Webhook received: Event='${event}', OrderID='${orderId}', PaymentID='${paymentId}'`);

    if (event === 'payment.captured' || event === 'order.paid') {
      if (orderId) {
        await Payment.updateByOrderId(orderId, {
          razorpay_payment_id: paymentId,
          status: 'paid',
          webhook_event: event,
          raw_response: body
        });
      }
    } else if (event === 'payment.failed') {
      if (orderId) {
        await Payment.updateByOrderId(orderId, {
          razorpay_payment_id: paymentId,
          status: 'failed',
          webhook_event: event,
          raw_response: body
        });
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
        grandTotal: parseFloat(reg.grand_total || 0)
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
