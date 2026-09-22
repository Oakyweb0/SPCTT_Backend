import { Abstract } from '../models/Abstract.js';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.js';
import { r2Service } from '../services/r2.service.js';
import { logger } from '../utils/logger.js';

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

      // Handle PDF file upload (strictly PDF & max 1 MB)
      let pdfUrl = req.body.pdfUrl || req.body.pdf_url || req.body.fileUrl || req.body.file_url || null;
      let uploadedFileObj = null;

      if (req.files) {
        if (req.files.pdf && req.files.pdf.length > 0) {
          uploadedFileObj = req.files.pdf[0];
        } else if (req.files.file && req.files.file.length > 0) {
          uploadedFileObj = req.files.file[0];
        }
      } else if (req.file) {
        uploadedFileObj = req.file;
      }

      if (uploadedFileObj) {
        const MAX_1MB = 1 * 1024 * 1024;
        if (uploadedFileObj.size && uploadedFileObj.size > MAX_1MB) {
          return sendValidationError(res, 'PDF file size exceeds 1 MB. Maximum allowed size is 1 MB.');
        }

        const isPdf = uploadedFileObj.mimetype === 'application/pdf' || 
                      (uploadedFileObj.originalname && uploadedFileObj.originalname.toLowerCase().endsWith('.pdf'));
        if (!isPdf) {
          return sendValidationError(res, 'Only PDF document files (.pdf) are permitted for abstract submissions.');
        }

        // Upload directly to Cloudflare R2 (folder: Abstract_pdf/)
        try {
          const r2UploadResult = await r2Service.uploadAbstractPdf({
            buffer: uploadedFileObj.buffer,
            originalName: uploadedFileObj.originalname,
            mimeType: uploadedFileObj.mimetype || 'application/pdf',
            filePath: uploadedFileObj.path
          });
          pdfUrl = r2UploadResult.url;
          logger.info(`Abstract PDF stored at: ${pdfUrl} (R2: ${r2UploadResult.isR2})`);
        } catch (uploadErr) {
          logger.error('Failed to upload PDF to Cloudflare R2 / storage:', uploadErr.message);
          return sendError(res, 'Failed to process and store abstract PDF file. Please try again.', 500, uploadErr);
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
