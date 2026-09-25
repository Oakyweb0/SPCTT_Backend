import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all admin routes with authentication and admin role requirement
router.use(authenticateToken, requireAdmin);

// 1. Dashboard Overview Stats
router.get('/dashboard-stats', adminController.getDashboardStats);

// 2. Registrations Management
router.get('/registrations/export', adminController.exportRegistrations);
router.get('/registrations', adminController.getRegistrations);
router.put('/registrations/:id/status', adminController.updateRegistrationStatus);

// 3. Abstracts Management
router.get('/abstracts/export', adminController.exportAbstracts);
router.get('/abstracts', adminController.getAbstracts);
router.put('/abstracts/:id/status', adminController.updateAbstractStatus);
router.post('/abstracts/:id/send-email', adminController.resendAbstractDecisionEmail);
router.get('/abstracts/:id/email-logs', adminController.getAbstractEmailLogs);
router.delete('/abstracts/:id', adminController.deleteAbstract);

// 4. Invoices Management
router.get('/invoices/:id/download', adminController.downloadInvoice);
router.get('/invoices/:id/pdf', adminController.viewInvoicePdf);
router.get('/invoices', adminController.getInvoices);

// 5. Payments Management
router.get('/payments/export', adminController.exportPayments);
router.get('/payments', adminController.getPayments);

// 6. Users Management
router.get('/users/export', adminController.exportUsers);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

export default router;
