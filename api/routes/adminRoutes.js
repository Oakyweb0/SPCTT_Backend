import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
  getDashboardStats,
  getAllRegistrations,
  updateRegistrationStatus,
  getAllAbstracts,
  updateAbstractStatus,
  getAllInvoices,
  getAllUsers
} from '../controllers/adminController.js';

const router = express.Router();

// Admin verification middleware
function requireAdmin(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    return next();
  }
  return res.status(403).json({
    status: false,
    message: 'Forbidden: Admin access required.'
  });
}

router.use(authenticateToken, requireAdmin);

router.get('/dashboard-stats', getDashboardStats);
router.get('/registrations', getAllRegistrations);
router.put('/registrations/:id/status', updateRegistrationStatus);
router.get('/abstracts', getAllAbstracts);
router.put('/abstracts/:id/status', updateAbstractStatus);
router.get('/invoices', getAllInvoices);
router.get('/users', getAllUsers);

export default router;
