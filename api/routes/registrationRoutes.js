import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
  getCategories,
  getUserRegistration,
  saveStep1Category,
  saveStep2Attendee,
  saveStep3Accompanying,
  saveStep4Billing,
  processPayment,
  getUserInvoices,
  getInvoiceById
} from '../controllers/registrationController.js';

const router = express.Router();

// Public: Get Categories
router.get('/categories', getCategories);

// Protected: Registration Steps & Details
router.get('/current', authenticateToken, getUserRegistration);
router.post('/step1-category', authenticateToken, saveStep1Category);
router.post('/step2-attendee', authenticateToken, saveStep2Attendee);
router.post('/step3-accompanying', authenticateToken, saveStep3Accompanying);
router.post('/step4-billing', authenticateToken, saveStep4Billing);
router.post('/payment', authenticateToken, processPayment);

// Protected: Invoices
router.get('/invoices', authenticateToken, getUserInvoices);
router.get('/invoices/:id', authenticateToken, getInvoiceById);

export default router;
