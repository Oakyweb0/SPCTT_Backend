import express from 'express';
import {
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
} from '../controllers/registration.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4
} from '../validators/registration.validator.js';

const router = express.Router();

/**
 * Public Routes
 */
// GET /api/registration/categories
router.get('/categories', getCategories);

/**
 * Protected Routes (Requires Bearer JWT)
 */
// GET /api/registration/current
router.get('/current', authenticateToken, getUserRegistration);

// Multi-Step Registration Flow
router.post('/step1-category', authenticateToken, validateStep1, saveStep1Category);
router.post('/step2-attendee', authenticateToken, validateStep2, saveStep2Attendee);
router.post('/step3-accompanying', authenticateToken, validateStep3, saveStep3Accompanying);
router.post('/step4-billing', authenticateToken, validateStep4, saveStep4Billing);

// Payment
router.post('/payment', authenticateToken, processPayment);

// Invoices
router.get('/invoices', authenticateToken, getUserInvoices);
router.get('/invoices/download/:invoiceNumber', authenticateToken, downloadInvoiceByNumber);
router.get('/invoices/:id/download', authenticateToken, downloadInvoice);
router.get('/invoices/:id/pdf', authenticateToken, viewInvoicePdf);
router.get('/invoices/:id', authenticateToken, getInvoiceById);

export default router;
