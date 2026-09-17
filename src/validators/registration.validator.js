import { sendValidationError } from '../utils/response.js';

/**
 * Validate Step 1: Category Selection
 */
export function validateStep1(req, res, next) {
  const { categoryId, categoryCode } = req.body;
  if (!categoryId && !categoryCode) {
    return sendValidationError(res, 'Please provide either a categoryId or categoryCode.');
  }
  next();
}

/**
 * Validate Step 2: Attendee & Contact Details
 */
export function validateStep2(req, res, next) {
  const { fullName, email, organization, address, city, state, country } = req.body;
  const errors = {};

  if (!fullName || !fullName.trim()) errors.fullName = 'Full name is required.';
  if (!email || !email.trim()) errors.email = 'Email address is required.';
  if (!organization || !organization.trim()) errors.organization = 'Organization is required.';
  if (!address || !address.trim()) errors.address = 'Address is required.';
  if (!city || !city.trim()) errors.city = 'City is required.';
  if (!state || !state.trim()) errors.state = 'State is required.';
  if (!country || !country.trim()) errors.country = 'Country is required.';

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, 'Please fill in all mandatory attendee and contact details.', errors);
  }
  next();
}

/**
 * Validate Step 3: Accompanying Persons
 */
export function validateStep3(req, res, next) {
  const { count, accompanyingPersons } = req.body;
  const personCount = parseInt(count || 0, 10);

  if (personCount > 0 && (!Array.isArray(accompanyingPersons) || accompanyingPersons.length < personCount)) {
    return sendValidationError(res, `Please provide details for all ${personCount} accompanying person(s).`);
  }
  next();
}

/**
 * Validate Step 4: Billing Details
 */
export function validateStep4(req, res, next) {
  next();
}

export default {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4
};
