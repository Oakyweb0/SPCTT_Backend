import { paymentService } from '../services/payment.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Initialize / Create Payment Order
 * POST /api/payment/create-order
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
 * Process / Confirm Payment
 * POST /api/payment/process (and POST /api/payment)
 */
export async function processPayment(req, res, next) {
  try {
    const userId = req.user.user_id;
    const result = await paymentService.processPayment(userId, req.body);
    return sendSuccess(res, result, 'Payment processed successfully! Your conference registration is confirmed.');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Verify Payment (Razorpay / Signature verification)
 * POST /api/payment/verify
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
 * Get Current User Payment Status
 * GET /api/payment/status
 */
export async function getPaymentStatus(req, res, next) {
  try {
    const userId = req.user.user_id;
    const result = await paymentService.getPaymentStatus(userId);
    return sendSuccess(res, result, 'Payment status fetched successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Get Payment / Invoice History
 * GET /api/payment/history
 */
export async function getPaymentHistory(req, res, next) {
  try {
    const userId = req.user.user_id;
    const result = await paymentService.getPaymentHistory(userId);
    return sendSuccess(res, result, 'Payment history fetched successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Get Payment Details for Registration
 * GET /api/payment/details/:registrationId
 */
export async function getPaymentDetails(req, res, next) {
  try {
    const userId = req.user.user_id;
    const role = req.user.role;
    const result = await paymentService.getPaymentDetails(req.params.registrationId, userId, role);
    return sendSuccess(res, result, 'Payment details retrieved successfully');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

export default {
  createOrder,
  processPayment,
  verifyPayment,
  getPaymentStatus,
  getPaymentHistory,
  getPaymentDetails
};
