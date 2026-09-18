import express from 'express';
import { getProfile, updateProfile, deleteProfile } from '../controllers/user.controller.js';
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

/**
 * @route   DELETE /api/user/profile
 * @desc    Delete current authenticated user account and data
 * @access  Private (Bearer JWT)
 */
router.delete('/profile', authenticateToken, deleteProfile);

export default router;
