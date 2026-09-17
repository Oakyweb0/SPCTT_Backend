import { userService } from '../services/user.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Get Authenticated User Profile
 * GET /api/user/profile
 */
export async function getProfile(req, res, next) {
  try {
    const userId = req.user.user_id;
    const user = await userService.getProfile(userId);
    return sendSuccess(res, { user }, 'Profile retrieved successfully.', 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

/**
 * Update Authenticated User Profile
 * PUT /api/user/profile
 */
export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.user_id;
    const updatedUser = await userService.updateProfile(userId, req.body);
    return sendSuccess(res, { user: updatedUser }, 'Profile updated successfully!', 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
}

export default { getProfile, updateProfile };
