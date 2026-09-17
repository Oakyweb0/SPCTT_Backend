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
    MAX_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10)
  },

  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

export default config;
