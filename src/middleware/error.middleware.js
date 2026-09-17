import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * 404 Not Found Middleware
 */
export function notFoundHandler(req, res) {
  return res.status(404).json({
    status: false,
    message: `Cannot ${req.method} ${req.originalUrl}. Route not found.`
  });
}

/**
 * Global Error Handler Middleware
 */
export function errorHandler(err, req, res, next) {
  logger.error(`Unhandled Exception at [${req.method} ${req.url}]:`, err.stack || err.message);

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  const response = {
    status: false,
    message: err.message || 'Internal Server Error'
  };

  // Provide stack trace in development mode only
  if (config.IS_DEVELOPMENT) {
    response.stack = err.stack;
    if (err.errors) {
      response.errors = err.errors;
    }
  }

  return res.status(statusCode).json(response);
}

export default { notFoundHandler, errorHandler };
