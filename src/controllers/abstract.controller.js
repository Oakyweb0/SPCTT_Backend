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
      const {
        name,
        authors,
        instituteName,
        institute_name,
        affiliation,
        category,
        email,
        phone,
        phoneNumber,
        phone_number,
        topic,
        title,
        abstractText,
        abstract_text
      } = req.body;

      const finalName = (name || authors || '').trim();
      const finalInstitute = (instituteName || institute_name || affiliation || '').trim();
      const finalCategory = (category || 'Poster').trim();
      const finalEmail = (email || '').trim();
      const finalPhone = (phone || phoneNumber || phone_number || '').trim();
      const finalTopic = (topic || title || '').trim();
      const finalAbstractText = (abstractText || abstract_text || '').trim();

      if (!finalName) {
        return sendValidationError(res, 'Presenter / Author name is required.');
      }
      if (!finalInstitute) {
        return sendValidationError(res, 'Institute name is required.');
      }
      if (!finalCategory) {
        return sendValidationError(res, 'Presentation category (Poster or Oral) is required.');
      }
      if (!finalEmail) {
        return sendValidationError(res, 'Email address is required.');
      }
      if (!finalPhone) {
        return sendValidationError(res, 'Phone number is required.');
      }
      if (!finalTopic) {
        return sendValidationError(res, 'Topic / Abstract title is required.');
      }

      // Handle file uploads (PDF and/or Image)
      let pdfUrl = req.body.pdfUrl || req.body.pdf_url || req.body.fileUrl || req.body.file_url || null;
      let imageUrl = req.body.imageUrl || req.body.image_url || null;

      if (req.files) {
        if (req.files.pdf && req.files.pdf.length > 0) {
          pdfUrl = `/uploads/${req.files.pdf[0].filename}`;
        }
        if (req.files.image && req.files.image.length > 0) {
          imageUrl = `/uploads/${req.files.image[0].filename}`;
        }
        if (req.files.file && req.files.file.length > 0) {
          const singleFile = req.files.file[0];
          if (singleFile.mimetype.startsWith('image/')) {
            imageUrl = imageUrl || `/uploads/${singleFile.filename}`;
          } else {
            pdfUrl = pdfUrl || `/uploads/${singleFile.filename}`;
          }
        }
      }

      const created = await Abstract.create({
        userId,
        name: finalName,
        instituteName: finalInstitute,
        category: finalCategory,
        email: finalEmail,
        phone: finalPhone,
        topic: finalTopic,
        title: finalTopic,
        authors: finalName,
        affiliation: finalInstitute,
        abstractText: finalAbstractText,
        pdfUrl,
        imageUrl,
        fileUrl: pdfUrl
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
  },

  /**
   * Delete abstract by ID
   * DELETE /api/abstracts/:id
   */
  async deleteAbstract(req, res, next) {
    try {
      const { id } = req.params;
      const targetId = parseInt(id, 10);
      const userId = req.user.user_id;
      const role = req.user.role;

      if (isNaN(targetId)) {
        return sendError(res, 'Invalid abstract ID.', 400);
      }

      const existing = await Abstract.findById(targetId);
      if (!existing) {
        return sendError(res, 'Abstract not found.', 404);
      }

      if (existing.user_id !== userId && role !== 'admin') {
        return sendError(res, 'Forbidden: You do not have permission to delete this abstract.', 403);
      }

      const deleted = await Abstract.deleteById(targetId);
      if (!deleted) {
        return sendError(res, 'Failed to delete abstract.', 500);
      }

      return sendSuccess(
        res,
        { id: targetId, abstract_code: existing.abstract_code },
        `Abstract '${existing.abstract_code}' deleted successfully.`
      );
    } catch (error) {
      console.error('Error deleting abstract:', error);
      return sendError(res, error.message || 'Failed to delete abstract.', 500, error);
    }
  }
};

export default abstractController;
