import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// 1. Determine environment (development | production | test)
const nodeEnv = process.env.NODE_ENV || 'development';

// 2. Load environment files in prioritized order:
//    - .env.<NODE_ENV>.local
//    - .env.<NODE_ENV> (e.g. .env.development or .env.production)
//    - .env.local
//    - .env (default/fallback)
const envFiles = [
  path.resolve(rootDir, `.env.${nodeEnv}.local`),
  path.resolve(rootDir, `.env.${nodeEnv}`),
  path.resolve(rootDir, '.env.local'),
  path.resolve(rootDir, '.env')
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

// Ensure default fallback dotenv execution
dotenv.config();

// Helper to sanitize arrays from comma-separated env values
const parseCorsOrigins = (rawOrigins) => {
  if (!rawOrigins) return ['*'];
  return rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
};

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: (process.env.NODE_ENV || 'development') === 'production',
  IS_DEVELOPMENT: (process.env.NODE_ENV || 'development') === 'development',
  
  PORT: parseInt(process.env.PORT || '5000', 10),
  APP_URL: process.env.APP_URL || '', // If empty, dynamically derived from req in controllers/app
  CLIENT_URL: process.env.CLIENT_URL || '',
  CORS_ALLOWED_ORIGINS: parseCorsOrigins(process.env.CLIENT_URL || process.env.CORS_ORIGINS),
  
  DB: {
    HOST: process.env.DB_HOST || '127.0.0.1',
    PORT: parseInt(process.env.DB_PORT || '3306', 10),
    USER: process.env.DB_USER || 'root',
    PASSWORD: process.env.DB_PASSWORD || '',
    NAME: process.env.DB_NAME || 'spctt_db',
    CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10)
  },
  
  JWT: {
    SECRET: process.env.JWT_SECRET || 'SPCTT_DEFAULT_SECURE_JWT_SECRET_2026_KEY',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h'
  },

  UPLOAD: {
    DIR: path.resolve(rootDir, process.env.UPLOAD_DIR || 'uploads'),
    MAX_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    ABSTRACT_MAX_SIZE_MB: parseInt(process.env.ABSTRACT_MAX_FILE_SIZE_MB || '1', 10)
  },

  R2: {
    ACCOUNT_ID: process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '4605438c0b6120f7fd4e672b18c86d9e',
    BUCKET_NAME: process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_BUCKET_NAME || 'spctt2027',
    ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    PUBLIC_URL: process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || '',
    FOLDER: process.env.R2_FOLDER || process.env.CLOUDFLARE_R2_FOLDER || 'Abstract_pdf'
  },

  EMAIL: {
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_SECURE: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    SMTP_USER: process.env.SMTP_USER || 'spctt2027@spctt.org',
    SMTP_PASS: process.env.SMTP_PASS || '',
    FROM_NAME: process.env.EMAIL_FROM_NAME || 'SPCTT 2027 Secretariat',
    FROM_EMAIL: process.env.EMAIL_FROM_ADDRESS || 'spctt2027@spctt.org',
    DEFAULT_FROM: process.env.SMTP_FROM || '"SPCTT 2027 Secretariat" <spctt2027@spctt.org>',
    CC_DEFAULT: process.env.EMAIL_CC_DEFAULT || 'tvivek2021@gmail.com'
  },

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  RAZORPAY: {
    KEY_ID: process.env.RAZORPAY_KEY_ID || '',
    KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
    WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    CURRENCY: process.env.RAZORPAY_CURRENCY || 'INR'
  }
};

export default config;
