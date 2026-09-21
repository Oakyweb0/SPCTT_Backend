import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all admin routes with authentication and admin role requirement
router.use(authenticateToken, requireAdmin);

// 1. Dashboard Overview Stats
router.get('/dashboard-stats', adminController.getDashboardStats);

// 2. Registrations Management
router.get('/registrations', adminController.getRegistrations);
router.put('/registrations/:id/status', adminController.updateRegistrationStatus);

// 3. Abstracts Management
router.get('/abstracts', adminController.getAbstracts);
router.put('/abstracts/:id/status', adminController.updateAbstractStatus);
router.delete('/abstracts/:id', adminController.deleteAbstract);

// 4. Invoices Management
router.get('/invoices', adminController.getInvoices);

// 5. Users Management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

export default router;
