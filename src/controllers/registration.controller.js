import { registrationService } from '../services/registration.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Get all registration categories
 * GET /api/registration/categories
 */
export async function getCategories(req, res, next) {
  try {
    const categories = await registrationService.getCategories();
    return sendSuccess(res, categories, 'Registration categories fetched successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Get Current User's Registration (Draft or Completed)
 * GET /api/registration/current
 */
export async function getUserRegistration(req, res, next) {
  try {
    const userId = req.user.user_id;
    const data = await registrationService.getUserRegistration(userId);
    return sendSuccess(res, data, 'User registration fetched successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Step 1: Select Category
 * POST /api/registration/step1-category
 */
export async function saveStep1Category(req, res, next) {
  try {
    const userId = req.user.user_id;
    const result = await registrationService.saveStep1Category(userId, req.body);
    return sendSuccess(res, result, 'Category selected successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Step 2: Save Attendee Details
 * POST /api/registration/step2-attendee
 */
export async function saveStep2Attendee(req, res, next) {
  try {
    const userId = req.user.user_id;
    const result = await registrationService.saveStep2Attendee(userId, req.body);
    return sendSuccess(res, result, 'Attendee and contact details saved successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Step 3: Save Accompanying Persons
 * POST /api/registration/step3-accompanying
 */
export async function saveStep3Accompanying(req, res, next) {
  try {
    const userId = req.user.user_id;
    const result = await registrationService.saveStep3Accompanying(userId, req.body);
    return sendSuccess(res, result, 'Accompanying persons saved successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Step 4: Save Billing Details
 * POST /api/registration/step4-billing
 */
export async function saveStep4Billing(req, res, next) {
  try {
    const userId = req.user.user_id;
    const result = await registrationService.saveStep4Billing(userId, req.body);
    return sendSuccess(res, result, 'Billing details saved and proforma invoice generated');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Process / Simulate Payment
 * POST /api/registration/payment
 */
export async function processPayment(req, res, next) {
  try {
    const userId = req.user.user_id;
    const result = await registrationService.processPayment(userId, req.body);
    return sendSuccess(res, result, 'Payment processed successfully! Your conference registration is confirmed.');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Get User Invoices
 * GET /api/registration/invoices
 */
export async function getUserInvoices(req, res, next) {
  try {
    const userId = req.user.user_id;
    const invoices = await registrationService.getUserInvoices(userId);
    return sendSuccess(res, invoices, 'Invoices fetched successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Get Specific Invoice by ID
 * GET /api/registration/invoices/:id
 */
export async function getInvoiceById(req, res, next) {
  try {
    const userId = req.user.user_id;
    const role = req.user.role;
    const invoice = await registrationService.getInvoiceById(req.params.id, userId, role);
    return sendSuccess(res, invoice, 'Invoice details retrieved successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Download Invoice PDF
 * GET /api/registration/invoices/:id/download
 */
export async function downloadInvoice(req, res, next) {
  try {
    const userId = req.user.user_id;
    const role = req.user.role;
    const { pdfBuffer, filename } = await registrationService.generateInvoicePdf(req.params.id, userId, role);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * View / Stream Invoice PDF inline in browser
 * GET /api/registration/invoices/:id/pdf
 */
export async function viewInvoicePdf(req, res, next) {
  try {
    const userId = req.user.user_id;
    const role = req.user.role;
    const { pdfBuffer, filename } = await registrationService.generateInvoicePdf(req.params.id, userId, role);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Download Invoice PDF by Invoice Number
 * GET /api/registration/invoices/download/:invoiceNumber
 */
export async function downloadInvoiceByNumber(req, res, next) {
  try {
    const userId = req.user.user_id;
    const role = req.user.role;
    const { pdfBuffer, filename } = await registrationService.generateInvoicePdfByNumber(req.params.invoiceNumber, userId, role);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

export default {
  getCategories,
  getUserRegistration,
  saveStep1Category,
  saveStep2Attendee,
  saveStep3Accompanying,
  saveStep4Billing,
  processPayment,
  getUserInvoices,
  getInvoiceById,
  downloadInvoice,
  viewInvoicePdf,
  downloadInvoiceByNumber
};
