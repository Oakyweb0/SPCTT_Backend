import { Category } from '../models/Category.js';
import { Registration } from '../models/Registration.js';
import { User } from '../models/User.js';
import { Invoice } from '../models/Invoice.js';
import { invoicePdfService } from './invoicePdf.service.js';

const ACCOMPANYING_PERSON_RATE = 3500.00;
const GST_PERCENT = 18.00;

export const registrationService = {
  /**
   * Get all active categories
   */
  async getCategories() {
    return Category.findAllActive();
  },

  /**
   * Get User Registration and related Invoices
   */
  async getUserRegistration(userId) {
    const user = await User.findById(userId);
    const registration = await Registration.findByUserId(userId);

    let invoices = [];
    if (registration) {
      invoices = await Registration.getInvoicesByRegistrationId(registration.id);
    }

    return {
      user: user || {},
      registration,
      invoices
    };
  },

  /**
   * Step 1: Select Category
   */
  async saveStep1Category(userId, { categoryId, categoryCode }) {
    const user = await User.findById(userId);

    let category = null;
    if (categoryId) {
      category = await Category.findById(categoryId);
    } else if (categoryCode) {
      category = await Category.findByCode(categoryCode);
    }

    if (!category) {
      const error = new Error('Registration category not found. Please select a valid category.');
      error.statusCode = 404;
      throw error;
    }

    const reg = await Registration.findOrCreateDraft(userId, user);

    const stepCompleted = Math.max(reg.step_completed || 1, 2);
    const catPrice = parseFloat(category.price || 0);
    const accompanyingTotal = parseFloat(reg.accompanying_total || 0);
    const subtotal = catPrice + accompanyingTotal;
    const gstAmount = parseFloat(((subtotal * GST_PERCENT) / 100).toFixed(2));
    const grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));

    await Registration.updateById(reg.id, {
      category_id: category.id,
      category_name: category.name,
      category_price: catPrice,
      subtotal,
      gst_rate: GST_PERCENT,
      gst_amount: gstAmount,
      grand_total: grandTotal,
      step_completed: stepCompleted
    });

    return {
      registrationId: reg.id,
      category
    };
  },

  /**
   * Step 2: Attendee and Contact Details
   */
  async saveStep2Attendee(userId, attendeeData) {
    const {
      title,
      fullName,
      email,
      organization,
      phone,
      address,
      city,
      state,
      country,
      pincode
    } = attendeeData;

    const user = await User.findById(userId);
    const reg = await Registration.findOrCreateDraft(userId, user);

    // Update user profile
    await User.updateById(userId, {
      title: title || 'Mr.',
      name: fullName,
      organization,
      phone: phone || null,
      address,
      city,
      state,
      country,
      pincode: pincode || null
    });

    // Update registration details
    const stepCompleted = Math.max(reg.step_completed || 1, 3);
    await Registration.updateById(reg.id, {
      title: title || 'Mr.',
      full_name: fullName,
      email,
      organization,
      phone: phone || null,
      address,
      city,
      state,
      country,
      pincode: pincode || null,
      step_completed: stepCompleted
    });

    return { registrationId: reg.id };
  },

  /**
   * Step 3: Accompanying Persons
   */
  async saveStep3Accompanying(userId, { count, accompanyingPersons }) {
    const user = await User.findById(userId);
    const reg = await Registration.findOrCreateDraft(userId, user);

    const personCount = parseInt(count || 0, 10);
    const validPersons = Array.isArray(accompanyingPersons) ? accompanyingPersons.slice(0, personCount) : [];
    const accompanyingTotal = personCount * ACCOMPANYING_PERSON_RATE;

    const catPrice = parseFloat(reg.category_price || 0);
    const subtotal = catPrice + accompanyingTotal;
    const gstAmount = parseFloat(((subtotal * GST_PERCENT) / 100).toFixed(2));
    const grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));

    const stepCompleted = Math.max(reg.step_completed || 1, 4);
    await Registration.updateById(reg.id, {
      accompanying_count: personCount,
      accompanying_persons: JSON.stringify(validPersons),
      accompanying_total: accompanyingTotal,
      subtotal,
      gst_rate: GST_PERCENT,
      gst_amount: gstAmount,
      grand_total: grandTotal,
      step_completed: stepCompleted
    });

    return {
      registrationId: reg.id,
      accompanyingCount: personCount,
      accompanyingTotal
    };
  },

  /**
   * Step 4: Billing Details & Proforma Invoice Generation
   */
  async saveStep4Billing(userId, billingData) {
    const { entityName, entityAddress, gstNumber, panNumber } = billingData;
    const user = await User.findById(userId);
    const reg = await Registration.findOrCreateDraft(userId, user);

    // Calculations
    const categoryPrice = parseFloat(reg.category_price || 0);
    const accompanyingTotal = parseFloat(reg.accompanying_total || 0);
    const subtotal = categoryPrice + accompanyingTotal;
    const gstAmount = parseFloat(((subtotal * GST_PERCENT) / 100).toFixed(2));
    const grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));

    await Registration.updateById(reg.id, {
      billing_entity_name: entityName || null,
      billing_address: entityAddress || null,
      gst_number: gstNumber || null,
      pan_number: panNumber || null,
      subtotal,
      gst_rate: GST_PERCENT,
      gst_amount: gstAmount,
      grand_total: grandTotal,
      step_completed: 4
    });

    // Regenerate proforma invoices
    await Registration.deleteUnpaidInvoices(reg.id);

    const invoices = [];

    // 1. Primary Registration Invoice
    const primaryGst = parseFloat(((categoryPrice * GST_PERCENT) / 100).toFixed(2));
    const primaryTotal = parseFloat((categoryPrice + primaryGst).toFixed(2));
    const primaryInvNum = `Proforma Invoice ${Math.floor(100 + Math.random() * 900)}`;

    const inv1Id = await Registration.createInvoice({
      invoice_number: primaryInvNum,
      registration_id: reg.id,
      user_id: userId,
      invoice_type: 'proforma_primary',
      title: `New Subscription - ${reg.category_name || 'Conference Registration'}`,
      description: `${reg.registration_code}: ${reg.title || ''} ${reg.full_name || user.name}`,
      quantity: 1,
      rate: categoryPrice,
      amount: categoryPrice,
      gst_rate: GST_PERCENT,
      gst_amount: primaryGst,
      total_amount: primaryTotal,
      status: 'unpaid'
    });

    invoices.push({
      id: inv1Id,
      invoiceNumber: primaryInvNum,
      title: `New Subscription - ${reg.category_name}`,
      description: `${reg.registration_code}: ${reg.title || ''} ${reg.full_name || user.name}`,
      qty: 1,
      rate: categoryPrice,
      amount: categoryPrice,
      gstRate: GST_PERCENT,
      gstAmount: primaryGst,
      totalAmount: primaryTotal
    });

    // 2. Accompanying Persons Invoice
    if (reg.accompanying_count > 0 && accompanyingTotal > 0) {
      const accGst = parseFloat(((accompanyingTotal * GST_PERCENT) / 100).toFixed(2));
      const accTotal = parseFloat((accompanyingTotal + accGst).toFixed(2));
      const accInvNum = `Proforma Invoice ${Math.floor(100 + Math.random() * 900)}`;

      const inv2Id = await Registration.createInvoice({
        invoice_number: accInvNum,
        registration_id: reg.id,
        user_id: userId,
        invoice_type: 'proforma_accompanying',
        title: 'Accompanying Person(s) Cost',
        description: `Registration for ${reg.accompanying_count} accompanying person(s)`,
        quantity: reg.accompanying_count,
        rate: ACCOMPANYING_PERSON_RATE,
        amount: accompanyingTotal,
        gst_rate: GST_PERCENT,
        gst_amount: accGst,
        total_amount: accTotal,
        status: 'unpaid'
      });

      invoices.push({
        id: inv2Id,
        invoiceNumber: accInvNum,
        title: 'Accompanying Person(s) Cost',
        description: `Registration for ${reg.accompanying_count} accompanying person(s)`,
        qty: reg.accompanying_count,
        rate: ACCOMPANYING_PERSON_RATE,
        amount: accompanyingTotal,
        gstRate: GST_PERCENT,
        gstAmount: accGst,
        totalAmount: accTotal
      });
    }

    return {
      registrationId: reg.id,
      billing: {
        entityName,
        entityAddress,
        gstNumber,
        panNumber
      },
      breakdown: {
        categoryPrice,
        accompanyingTotal,
        subtotal,
        gstRate: GST_PERCENT,
        gstAmount,
        grandTotal
      },
      invoices
    };
  },

  /**
   * Process and simulate payment
   */
  async processPayment(userId, { registrationId, paymentMethod }) {
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

    // Ensure grand_total and subtotal are calculated if somehow 0
    let subtotal = parseFloat(reg.subtotal || 0);
    let gstRate = parseFloat(reg.gst_rate || GST_PERCENT);
    let gstAmount = parseFloat(reg.gst_amount || 0);
    let grandTotal = parseFloat(reg.grand_total || 0);

    if (grandTotal === 0 && (parseFloat(reg.category_price || 0) > 0 || parseFloat(reg.accompanying_total || 0) > 0)) {
      const catPrice = parseFloat(reg.category_price || 0);
      const accTotal = parseFloat(reg.accompanying_total || 0);
      subtotal = catPrice + accTotal;
      gstAmount = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
      grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));
    }

    const txnId = `PAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const method = paymentMethod || 'Axis Razorpay (Elisyan India)';

    // Confirm registration
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
      rate: subtotal,
      amount: subtotal,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      total_amount: grandTotal,
      status: 'paid'
    });

    const allInvoices = await Registration.getInvoicesByRegistrationId(reg.id);

    return {
      registration: updatedReg,
      transactionId: txnId,
      invoices: allInvoices
    };
  },

  /**
   * Get all user invoices
   */
  async getUserInvoices(userId) {
    return Registration.getInvoicesByUserId(userId);
  },

  /**
   * Get single invoice by ID
   */
  async getInvoiceById(invoiceId, userId, role) {
    const invoice = await Invoice.findById(invoiceId, userId, role) || await Registration.getInvoiceById(invoiceId, userId, role);
    if (!invoice) {
      const error = new Error('Invoice not found.');
      error.statusCode = 404;
      throw error;
    }
    return invoice;
  },

  /**
   * Generate Invoice / Receipt PDF Buffer
   */
  async generateInvoicePdf(invoiceId, userId, role) {
    const invoice = await this.getInvoiceById(invoiceId, userId, role);
    const pdfBuffer = await invoicePdfService.generateInvoicePdf(invoice);
    return {
      invoice,
      pdfBuffer,
      filename: `Invoice_${invoice.invoice_number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`
    };
  },

  /**
   * Generate Invoice / Receipt PDF Buffer by Invoice Number
   */
  async generateInvoicePdfByNumber(invoiceNumber, userId, role) {
    const invoice = await Invoice.findByInvoiceNumber(invoiceNumber, userId, role);
    if (!invoice) {
      const error = new Error(`Invoice '${invoiceNumber}' not found.`);
      error.statusCode = 404;
      throw error;
    }
    const pdfBuffer = await invoicePdfService.generateInvoicePdf(invoice);
    return {
      invoice,
      pdfBuffer,
      filename: `Invoice_${invoice.invoice_number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`
    };
  }
};

export default registrationService;
