import express from 'express';
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  getPaymentHistoryByRegistration,
  getAllPaymentsHistory,
  getPaymentById,
  exportPayments,
  getPaymentStatusByRegistrationId
} from '../controllers/payment.controller.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';

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

// 3. Get User Payment History (Current authenticated user's transactions from DB)
// GET /api/payments/history
router.get('/history', authenticateToken, getPaymentHistory);

// 4. Get Payment History for a specific Registration
// GET /api/payments/history/registration/:registrationId
router.get('/history/registration/:registrationId', authenticateToken, getPaymentHistoryByRegistration);

// 5. Admin: Export All Payment Transactions to Excel (.xlsx)
// GET /api/payments/export
router.get('/export', authenticateToken, requireAdmin, exportPayments);

// 6. Admin: Get All Payment Transactions with Filters and Pagination
// GET /api/payments/all
router.get('/all', authenticateToken, requireAdmin, getAllPaymentsHistory);

// 7. Get Payment Status for a specific Registration
// GET /api/payments/status/:registrationId
router.get('/status/:registrationId', authenticateToken, getPaymentStatusByRegistrationId);

// 8. Get Single Payment Transaction Details by Payment ID
// GET /api/payments/:id
router.get('/:id', authenticateToken, getPaymentById);

export default router;
