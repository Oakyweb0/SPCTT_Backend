import { Registration } from '../models/Registration.js';
import { User } from '../models/User.js';

export const paymentService = {
  /**
   * Create / Prepare Payment Order
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
    const amount = parseFloat(reg.grand_total || 0);

    return {
      orderId,
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
        subtotal: parseFloat(reg.subtotal || 0),
        gstRate: parseFloat(reg.gst_rate || 18.00),
        gstAmount: parseFloat(reg.gst_amount || 0),
        grandTotal: amount
      }
    };
  },

  /**
   * Process & Confirm Payment
   */
  async processPayment(userId, { registrationId, paymentMethod, transactionId, paymentGateway } = {}) {
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

    const txnId = transactionId || `PAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const method = paymentMethod || paymentGateway || 'Axis Razorpay (Elisyan India)';

    // Confirm registration
    const updatedReg = await Registration.updateById(reg.id, {
      payment_method: method,
      payment_status: 'paid',
      transaction_id: txnId,
      paid_at: new Date(),
      status: 'confirmed'
    });

    // Mark existing invoices paid
    await Registration.updateInvoicesToPaid(reg.id);

    // Create official tax receipt invoice
    const receiptNum = `RCPT-${new Date().getFullYear()}-${String(reg.id).padStart(5, '0')}`;
    await Registration.createInvoice({
      invoice_number: receiptNum,
      registration_id: reg.id,
      user_id: userId,
      invoice_type: 'receipt',
      title: 'Official Receipt & Tax Invoice - SPCTT 2026',
      description: `Payment confirmed for ${reg.registration_code} via ${method} (Txn: ${txnId})`,
      quantity: 1,
      rate: reg.subtotal,
      amount: reg.subtotal,
      gst_rate: reg.gst_rate,
      gst_amount: reg.gst_amount,
      total_amount: reg.grand_total,
      status: 'paid'
    });

    const allInvoices = await Registration.getInvoicesByRegistrationId(reg.id);

    return {
      registration: updatedReg,
      transactionId: txnId,
      paymentStatus: 'paid',
      paymentMethod: method,
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
        paymentMethod: 'Axis Razorpay (Elisyan India)',
        transactionId: txnId
      });
    }

    const updatedReg = await Registration.findById(reg.id);
    const invoices = await Registration.getInvoicesByRegistrationId(reg.id);

    return {
      verified: true,
      transactionId: txnId,
      orderId: razorpayOrderId || null,
      paymentStatus: updatedReg.payment_status,
      registration: updatedReg,
      invoices
    };
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
      invoices
    };
  },

  /**
   * Get User Payment & Invoice History
   */
  async getPaymentHistory(userId) {
    const invoices = await Registration.getInvoicesByUserId(userId);
    return invoices;
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

