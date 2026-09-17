import express from 'express';
import { getProfile, updateProfile } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/user/profile
 * @desc    Get current authenticated user profile
 * @access  Private (Bearer JWT)
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @route   PUT /api/user/profile
 * @desc    Update current authenticated user profile
 * @access  Private (Bearer JWT)
 */
router.put('/profile', authenticateToken, updateProfile);

export default router;
