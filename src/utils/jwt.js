import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Generate a signed JWT token for a user
 */
export function generateToken(payload, expiresIn = config.JWT.EXPIRES_IN) {
  return jwt.sign(payload, config.JWT.SECRET, { expiresIn });
}

/**
 * Verify a given JWT token
 */
export function verifyToken(token) {
  try {
    return { valid: true, decoded: jwt.verify(token, config.JWT.SECRET) };
  } catch (error) {
    return {
      valid: false,
      error: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      expired: error.name === 'TokenExpiredError'
    };
  }
}

/**
 * Decode JWT without verifying signature
 */
export function decodeToken(token) {
  return jwt.decode(token);
}

export default { generateToken, verifyToken, decodeToken };
