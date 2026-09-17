import { authService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * User Signup / Register
 * POST /api/auth/signup or POST /api/auth/register
 */
export async function signup(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return sendSuccess(res, result, 'Account created successfully!', 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * User Login
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return sendSuccess(res, result, 'Login successful!', 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Admin Login
 * POST /api/auth/admin/login
 */
export async function adminLogin(req, res, next) {
  try {
    const result = await authService.adminLogin(req.body);
    return sendSuccess(res, result, 'Admin login successful!', 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

export default { signup, login, adminLogin };
