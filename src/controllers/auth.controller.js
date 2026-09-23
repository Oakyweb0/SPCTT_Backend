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

/**
 * Forgot Password - Generate Reset Token
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    return sendSuccess(res, result, result.message, 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Verify Password Reset Token
 * POST /api/auth/verify-reset-token
 */
export async function verifyResetToken(req, res, next) {
  try {
    const { token } = req.body;
    const result = await authService.verifyResetToken(token);
    return sendSuccess(res, result, 'Password reset token is valid.', 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Reset Password
 * POST /api/auth/reset-password
 */
export async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword(req.body);
    return sendSuccess(res, result, result.message, 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Change Password (for logged in user)
 * POST /api/auth/change-password
 */
export async function changePassword(req, res, next) {
  try {
    const userId = req.user.user_id || req.user.id;
    const result = await authService.changePassword({
      userId,
      ...req.body
    });
    return sendSuccess(res, result, result.message, 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

export default {
  signup,
  login,
  adminLogin,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword
};
