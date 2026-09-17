import { verifyToken } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';

/**
 * Authenticate incoming Bearer JWT token
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return sendError(res, 'Unauthorized: Authorization header is missing.', 401);
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return sendError(res, 'Unauthorized: Bearer token format required (e.g. Bearer <token>).', 401);
  }

  const token = parts[1];
  const { valid, decoded, error } = verifyToken(token);

  if (!valid) {
    return sendError(res, `Unauthorized: ${error}.`, 401);
  }

  req.user = decoded;
  next();
}

/**
 * Role authorization middleware factory
 * @param  {...string} allowedRoles
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized: User not authenticated.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'Forbidden: Insufficient permissions to access this resource.', 403);
    }

    next();
  };
}

export const requireAdmin = authorizeRoles('admin', 'manager');

export default { authenticateToken, authorizeRoles, requireAdmin };
