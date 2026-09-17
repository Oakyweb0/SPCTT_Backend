import express from 'express';
import { signup, login, adminLogin } from '../controllers/auth.controller.js';
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

export default router;
