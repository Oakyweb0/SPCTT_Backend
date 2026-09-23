import express from 'express';
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatusByRegistrationId
} from '../controllers/payment.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Public Webhook Route (No Bearer JWT required, authenticated via Razorpay signature)
 * POST /api/payments/webhook
 */
router.post('/webhook', handleWebhook);

/**
 * Authenticated Payment Routes (Require Bearer JWT)
 */

// 1. Create / Initialize Razorpay Payment Order
// POST /api/payments/create-order
router.post('/create-order', authenticateToken, createOrder);

// 2. Verify Razorpay Payment Signature
// POST /api/payments/verify
router.post('/verify', authenticateToken, verifyPayment);

// 3. Get Payment Status for a specific Registration
// GET /api/payments/status/:registrationId
router.get('/status/:registrationId', authenticateToken, getPaymentStatusByRegistrationId);

export default router;
