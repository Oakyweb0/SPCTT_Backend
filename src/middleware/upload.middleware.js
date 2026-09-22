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

// Dedicated Abstract PDF Uploader: Memory storage for R2, strictly PDF only, strictly 1MB max limit
const abstractPdfStorage = multer.memoryStorage();

const abstractPdfFilter = (req, file, cb) => {
  const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF documents (.pdf) are allowed for scientific abstract submissions. Images and other file types are not accepted.'), false);
  }
};

const rawAbstractUpload = multer({
  storage: abstractPdfStorage,
  limits: {
    fileSize: (config.UPLOAD.ABSTRACT_MAX_SIZE_MB || 1) * 1024 * 1024 // 1 MB strict limit
  },
  fileFilter: abstractPdfFilter
});

/**
 * Middleware wrapper for handling Abstract PDF upload with clear 1MB & format error messages
 */
export const uploadAbstractPdfMiddleware = (req, res, next) => {
  const uploader = rawAbstractUpload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'file', maxCount: 1 }
  ]);

  uploader(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: false,
          message: 'PDF file size exceeds the 1 MB limit (Maximum allowed: 1 MB). Please compress your PDF and try again.',
          error: 'FILE_TOO_LARGE'
        });
      }
      return res.status(400).json({
        status: false,
        message: err.message || 'File upload error. Only PDF files up to 1 MB are accepted.',
        error: 'INVALID_FILE'
      });
    }
    next();
  });
};

export default upload;

