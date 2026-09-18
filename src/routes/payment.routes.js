import express from 'express';
import {
  createOrder,
  processPayment,
  verifyPayment,
  getPaymentStatus,
  getPaymentHistory,
  getPaymentDetails
} from '../controllers/payment.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * All Payment Routes require Bearer JWT Authentication
 */
router.use(authenticateToken);

// Create / Initialize Payment Order
router.post('/create-order', createOrder);

// Process / Confirm Payment
router.post('/process', processPayment);
router.post('/', processPayment); // Alias to POST /api/payment

// Verify Payment Gateway Transaction / Signature
router.post('/verify', verifyPayment);

// Get Payment Status of Current User
router.get('/status', getPaymentStatus);

// Get User Payment & Invoice History
router.get('/history', getPaymentHistory);

// Get Payment Details for a specific registration
router.get('/details/:registrationId', getPaymentDetails);

export default router;
