import { paymentService } from '../services/payment.service.js';
import { excelService } from '../services/excel.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Initialize / Create Razorpay Payment Order
 * POST /api/payments/create-order
 */
export async function createOrder(req, res, next) {
  try {
    const userId = req.user.user_id;
    const result = await paymentService.createPaymentOrder(userId, req.body);
    return sendSuccess(res, result, 'Payment order created successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Verify Razorpay Payment Signature
 * POST /api/payments/verify
 */
export async function verifyPayment(req, res, next) {
  try {
    const userId = req.user.user_id;
    const result = await paymentService.verifyPayment(userId, req.body);
    return sendSuccess(res, result, 'Payment signature verified and registration confirmed');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Razorpay Webhook Handler
 * POST /api/payments/webhook
 */
export async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'] || '';
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const result = await paymentService.handleWebhook(req.body, signature, rawBody);
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    return res.status(error.statusCode || 400).json({ status: false, message: error.message });
  }
}

/**
 * Get Current User Payment History from Database
 * GET /api/payments/history
 */
export async function getPaymentHistory(req, res, next) {
  try {
    const userId = req.user.user_id;
    const history = await paymentService.getPaymentHistory(userId);
    return sendSuccess(res, history, 'Payment history retrieved successfully from database');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Get Payment History specifically for a Registration ID
 * GET /api/payments/history/registration/:registrationId
 */
export async function getPaymentHistoryByRegistration(req, res, next) {
  try {
    const userId = req.user.user_id;
    const role = req.user.role;
    const registrationId = req.params.registrationId;
    const result = await paymentService.getPaymentHistoryByRegistrationId(registrationId, userId, role);
    return sendSuccess(res, result, 'Registration payment history retrieved successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Get All Payments History with Pagination & Filters (Admin)
 * GET /api/payments/all
 */
export async function getAllPaymentsHistory(req, res, next) {
  try {
    const { page, limit, status, search, userId, registrationId } = req.query;
    const result = await paymentService.getAllPaymentHistory({
      page,
      limit,
      status,
      search,
      userId,
      registrationId
    });
    return sendSuccess(res, result, 'All payment transactions retrieved successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Get Single Payment Details by Payment ID
 * GET /api/payments/:id
 */
export async function getPaymentById(req, res, next) {
  try {
    const userId = req.user.user_id;
    const role = req.user.role;
    const paymentId = req.params.id;
    const payment = await paymentService.getPaymentById(paymentId, userId, role);
    return sendSuccess(res, payment, 'Payment details retrieved successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Export Payments to Excel (.xlsx) (Admin)
 * GET /api/payments/export
 */
export async function exportPayments(req, res, next) {
  try {
    const { status, search, userId, registrationId } = req.query;
    const { payments } = await paymentService.getAllPaymentHistory({
      page: 1,
      limit: 5000,
      status,
      search,
      userId,
      registrationId
    });

    const buffer = await excelService.generatePaymentsExcel(payments);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `SPCTT_Payments_${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (error) {
    console.error('Error exporting payments to Excel:', error);
    return sendError(res, 'Failed to export payments to Excel.', 500, error);
  }
}

/**
 * Get Payment Status by Registration ID
 * GET /api/payments/status/:registrationId
 */
export async function getPaymentStatusByRegistrationId(req, res, next) {
  try {
    const userId = req.user.user_id;
    const role = req.user.role;
    const registrationId = req.params.registrationId;
    const result = await paymentService.getPaymentStatusByRegistrationId(registrationId, userId, role);
    return sendSuccess(res, result, 'Payment status fetched successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

export default {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  getPaymentHistoryByRegistration,
  getAllPaymentsHistory,
  getPaymentById,
  exportPayments,
  getPaymentStatusByRegistrationId
};
