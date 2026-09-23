import { paymentService } from '../services/payment.service.js';
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
  getPaymentStatusByRegistrationId
};
