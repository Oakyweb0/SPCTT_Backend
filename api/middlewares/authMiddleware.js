import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'SPCTT_SECURE_JWT_SECRET_KEY_2026_!@#$%';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  
  if (!authHeader) {
    return res.status(401).json({
      status: false,
      message: 'Unauthorized: Authorization header is missing.'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      status: false,
      message: 'Unauthorized: Bearer token format required (e.g. Bearer <token>).'
    });
  }

  const token = parts[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        status: false,
        message: err.name === 'TokenExpiredError' ? 'Unauthorized: Token has expired.' : 'Unauthorized: Invalid token.'
      });
    }

    req.user = decoded;
    next();
  });
}
