import { sendValidationError } from '../utils/response.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate user signup payload
 */
export function validateSignup(req, res, next) {
  const { name, fullName, email, organization, city, state, country, password } = req.body;
  const errors = {};

  const resolvedName = (fullName || name || '').trim();
  if (!resolvedName) {
    errors.name = 'Full name is required.';
  }

  const resolvedEmail = (email || '').trim().toLowerCase();
  if (!resolvedEmail) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(resolvedEmail)) {
    errors.email = 'Please provide a valid email address.';
  }

  if (!organization || !organization.trim()) {
    errors.organization = 'Organization / Institution name is required.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters long.';
  }

  if (country !== undefined && !country.trim()) {
    errors.country = 'Country is required.';
  }

  if (state !== undefined && !state.trim()) {
    errors.state = 'State is required.';
  }

  if (city !== undefined && !city.trim()) {
    errors.city = 'City is required.';
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, 'Validation Error: Please check your input fields.', errors);
  }

  next();
}

/**
 * Validate user & admin login payload
 */
export function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = {};

  if (!email || !email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
    errors.email = 'Invalid email address format.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, 'Validation Error: Email and password are required.', errors);
  }

  next();
}

export default { validateSignup, validateLogin };
