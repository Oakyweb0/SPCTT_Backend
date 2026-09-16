import express from 'express';
import { signup, login, adminLogin } from '../controllers/authController.js';

const router = express.Router();

// User Signup & Login
router.post('/signup', signup);
router.post('/register', signup);
router.post('/login', login);

// Admin Login
router.post('/admin/login', adminLogin);

export default router;
