/**
 * Standardized API Response Utilities
 */

/**
 * Send a successful JSON response
 */
export function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    status: true,
    message,
    ...(data !== null && { data })
  });
}

/**
 * Send an error JSON response
 */
export function sendError(res, message = 'Internal Server Error', statusCode = 500, error = null) {
  const responsePayload = {
    status: false,
    message
  };

  if (error) {
    responsePayload.error = typeof error === 'string' ? error : error.message || error;
  }

  return res.status(statusCode).json(responsePayload);
}

/**
 * Send a validation error JSON response (HTTP 422)
 */
export function sendValidationError(res, message = 'Validation failed', errors = null) {
  return res.status(422).json({
    status: false,
    message,
    ...(errors && { errors })
  });
}

export default { sendSuccess, sendError, sendValidationError };
