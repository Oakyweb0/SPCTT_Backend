import express from 'express';
import {
  signup,
  login,
  adminLogin,
  forgotPassword,
  verifyResetToken,
  resetPassword
} from '../controllers/auth.controller.js';
import { validateSignup, validateLogin } from '../validators/auth.validator.js';

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @route   POST /api/auth/register
 * @desc    Register a new attendee / user
 * @access  Public
 */
router.post('/signup', validateSignup, signup);
router.post('/register', validateSignup, signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user / attendee and get Bearer JWT
 * @access  Public
 */
router.post('/login', validateLogin, login);

/**
 * @route   POST /api/auth/admin/login
 * @desc    Login administrator / manager
 * @access  Public
 */
router.post('/admin/login', validateLogin, adminLogin);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset token
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/verify-reset-token
 * @desc    Verify if reset token is valid and not expired
 * @access  Public
 */
router.post('/verify-reset-token', verifyResetToken);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 */
router.post('/reset-password', resetPassword);

export default router;
