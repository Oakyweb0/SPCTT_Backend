import { Abstract } from '../models/Abstract.js';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.js';

export const abstractController = {
  /**
   * Submit an abstract
   * POST /api/abstracts
   */
  async submitAbstract(req, res, next) {
    try {
      const userId = req.user.user_id;
      const { title, authors, affiliation, category, abstractText, fileUrl } = req.body;

      if (!title || !authors || !affiliation || !abstractText) {
        return sendValidationError(res, 'Title, authors, affiliation, and abstractText are required.');
      }

      const created = await Abstract.create({
        userId,
        title: title.trim(),
        authors: authors.trim(),
        affiliation: affiliation.trim(),
        category: category ? category.trim() : 'General',
        abstractText: abstractText.trim(),
        fileUrl: fileUrl || null
      });

      return sendSuccess(res, created, 'Abstract submitted successfully!', 201);
    } catch (error) {
      console.error('Error submitting abstract:', error);
      return sendError(res, 'Failed to submit abstract.', 500, error);
    }
  },

  /**
   * Get all abstracts submitted by authenticated user
   * GET /api/abstracts/my
   */
  async getMyAbstracts(req, res, next) {
    try {
      const userId = req.user.user_id;
      const abstracts = await Abstract.findByUserId(userId);
      return sendSuccess(res, abstracts, 'Abstracts retrieved successfully.');
    } catch (error) {
      console.error('Error fetching user abstracts:', error);
      return sendError(res, 'Failed to fetch abstracts.', 500, error);
    }
  },

  /**
   * Get abstract by ID
   * GET /api/abstracts/:id
   */
  async getAbstractById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;
      const role = req.user.role;

      const abstract = await Abstract.findById(id);
      if (!abstract) {
        return sendError(res, 'Abstract not found.', 404);
      }

      if (abstract.user_id !== userId && role !== 'admin') {
        return sendError(res, 'Forbidden: You do not have access to this abstract.', 403);
      }

      return sendSuccess(res, abstract, 'Abstract retrieved successfully.');
    } catch (error) {
      console.error('Error fetching abstract by ID:', error);
      return sendError(res, 'Failed to fetch abstract.', 500, error);
    }
  }
};

export default abstractController;
