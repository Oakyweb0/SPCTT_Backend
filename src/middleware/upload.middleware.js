import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env.js';

// Ensure upload destination folder exists
if (!fs.existsSync(config.UPLOAD.DIR)) {
  fs.mkdirSync(config.UPLOAD.DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.UPLOAD.DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    cb(null, `${sanitizedBase}_${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP, PDF, DOC, DOCX`), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: config.UPLOAD.MAX_SIZE_MB * 1024 * 1024
  },
  fileFilter
});

// Dedicated Cloudflare R2 Uploader: Memory storage for R2, supports both PDF and Image files up to 20MB max limit
const memoryUploadStorage = multer.memoryStorage();

const abstractDocumentFilter = (req, file, cb) => {
  const isPdf = file.mimetype === 'application/pdf' || (file.originalname && file.originalname.toLowerCase().endsWith('.pdf'));
  const isImage = file.mimetype?.startsWith('image/') || 
                  (file.originalname && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.originalname));

  if (isPdf || isImage) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF documents (.pdf) and Image files (.jpg, .jpeg, .png, .webp) up to 20 MB are allowed for submissions.'), false);
  }
};

const rawAbstractUpload = multer({
  storage: memoryUploadStorage,
  limits: {
    fileSize: 35 * 1024 * 1024, // 35 MB buffer limit in Multer (safely accommodates 20MB file + multipart header overhead)
    fieldSize: 35 * 1024 * 1024
  },
  fileFilter: abstractDocumentFilter
});

/**
 * Middleware wrapper for handling Abstract PDF & Image upload with clear 20MB & format error messages
 */
export const uploadAbstractPdfMiddleware = (req, res, next) => {
  const uploader = rawAbstractUpload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'document', maxCount: 1 }
  ]);

  uploader(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: false,
          message: 'File size exceeds the 20 MB limit (Maximum allowed: 20 MB). Please compress your file and try again.',
          error: 'FILE_TOO_LARGE'
        });
      }
      return res.status(400).json({
        status: false,
        message: err.message || 'File upload error. Only PDF and Image files up to 20 MB are accepted.',
        error: 'INVALID_FILE'
      });
    }

    const uploadedFile = (req.files?.pdf && req.files.pdf[0]) || 
                         (req.files?.file && req.files.file[0]) ||
                         (req.files?.image && req.files.image[0]) ||
                         (req.files?.document && req.files.document[0]);

    if (uploadedFile && uploadedFile.size > 20 * 1024 * 1024) {
      return res.status(400).json({
        status: false,
        message: `File size (${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 20 MB limit. Please compress your file and try again.`,
        error: 'FILE_TOO_LARGE'
      });
    }

    next();
  });
};

export const uploadAbstractMiddleware = uploadAbstractPdfMiddleware;

export default upload;

