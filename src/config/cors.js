import cors from 'cors';
import { config } from './env.js';

/**
 * Dynamic CORS options delegate
 * Allows requests from localhost/development ports, configured CLIENT_URL,
 * or allows any origin if configured with '*'
 */
export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // In development mode, allow all localhost and 127.0.0.1 ports dynamically
    if (config.IS_DEVELOPMENT) {
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
    }

    // Check against configured allowed origins
    const allowed = config.CORS_ALLOWED_ORIGINS;
    if (allowed.includes('*') || allowed.includes(origin)) {
      return callback(null, true);
    }

    // Check if origin matches any wildcard pattern if provided
    const isMatched = allowed.some((allowedOrigin) => {
      if (allowedOrigin.startsWith('*.') || allowedOrigin.startsWith('http://*.') || allowedOrigin.startsWith('https://*.')) {
        const domainPattern = allowedOrigin.replace('*.', '');
        return origin.endsWith(domainPattern);
      }
      return false;
    });

    if (isMatched) {
      return callback(null, true);
    }

    // Allow self-origin or any spctt subdomains automatically
    if (/^https?:\/\/(.+\.)?(spctt\.org|spctt2026\.org)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Default: allow in dev
    if (config.IS_DEVELOPMENT) {
      return callback(null, true);
    }

    return callback(new Error(`CORS origin '${origin}' not allowed by SPCTT CORS Policy`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma', 'Expires', 'If-None-Match', 'If-Modified-Since'],
  credentials: true,
  optionsSuccessStatus: 200
};

export const corsMiddleware = cors(corsOptions);
export default corsMiddleware;
