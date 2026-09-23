import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/env.js';
import corsMiddleware from './config/cors.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import registrationRoutes from './routes/registration.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';
import abstractRoutes from './routes/abstract.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy (Nginx, Cloudflare, etc.) to get correct https protocol
app.set('trust proxy', true);

// Disable ETag generation to prevent 304 Not Modified caching (forces 200 OK with fresh data)
app.set('etag', false);

// 1. Security & Core Middleware
app.use(corsMiddleware);
app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  next();
});
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// 2. Static File Serving (Uploads)
app.use('/uploads', express.static(config.UPLOAD.DIR));

// 3. Dynamic Swagger UI Documentation
const swaggerSpecPath = path.join(__dirname, 'docs', 'swagger.json');
const getSwaggerSpec = () => {
  try {
    if (fs.existsSync(swaggerSpecPath)) {
      return JSON.parse(fs.readFileSync(swaggerSpecPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Note: Swagger spec file error:', err.message);
  }
  return {};
};

const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .opblock-tag { font-size: 1.2rem; font-weight: 700; border-bottom: 2px solid #0f4c64; padding-bottom: 5px; margin-top: 25px; }
  `,
  customSiteTitle: 'SPCTT 2026 API Documentation',
  swaggerOptions: {
    persistAuthorization: true
  }
};

// Direct JSON spec endpoint
app.get('/api-docs/swagger.json', (req, res) => res.json(getSwaggerSpec()));
app.get('/api/docs/swagger.json', (req, res) => res.json(getSwaggerSpec()));

// Swagger UI mount
app.use('/api-docs', swaggerUi.serve, (req, res, next) => {
  swaggerUi.setup(getSwaggerSpec(), swaggerUiOptions)(req, res, next);
});
app.use('/api/docs', swaggerUi.serve, (req, res, next) => {
  swaggerUi.setup(getSwaggerSpec(), swaggerUiOptions)(req, res, next);
});

// 4. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/abstracts', abstractRoutes);

// 5. Dynamic Root Discovery Endpoint (No hardcoded localhost)
app.get('/', (req, res) => {
  const baseUrl = config.APP_URL || `${req.protocol}://${req.get('host')}`;

  res.json({
    status: true,
    message: 'SPCTT 2026 Conference REST API Server is running!',
    environment: config.NODE_ENV,
    baseUrl,
    documentation: `${baseUrl}/api-docs`,
    endpoints: {
      auth: {
        signup: `POST ${baseUrl}/api/auth/signup`,
        login: `POST ${baseUrl}/api/auth/login`,
        adminLogin: `POST ${baseUrl}/api/auth/admin/login`
      },
      user: {
        profile: `GET ${baseUrl}/api/user/profile`,
        updateProfile: `PUT ${baseUrl}/api/user/profile`
      },
      registration: {
        categories: `GET ${baseUrl}/api/registration/categories`,
        currentRegistration: `GET ${baseUrl}/api/registration/current`,
        step1Category: `POST ${baseUrl}/api/registration/step1-category`,
        step2Attendee: `POST ${baseUrl}/api/registration/step2-attendee`,
        step3Accompanying: `POST ${baseUrl}/api/registration/step3-accompanying`,
        step4Billing: `POST ${baseUrl}/api/registration/step4-billing`,
        payment: `POST ${baseUrl}/api/registration/payment`,
        invoices: `GET ${baseUrl}/api/registration/invoices`,
        invoiceById: `GET ${baseUrl}/api/registration/invoices/:id`
      },
      payments: {
        createOrder: `POST ${baseUrl}/api/payments/create-order`,
        verifyPayment: `POST ${baseUrl}/api/payments/verify`,
        webhook: `POST ${baseUrl}/api/payments/webhook`,
        statusByRegistration: `GET ${baseUrl}/api/payments/status/:registrationId`
      },
      admin: {
        dashboardStats: `GET ${baseUrl}/api/admin/dashboard-stats`,
        registrations: `GET ${baseUrl}/api/admin/registrations`,
        abstracts: `GET ${baseUrl}/api/admin/abstracts`,
        invoices: `GET ${baseUrl}/api/admin/invoices`,
        users: `GET ${baseUrl}/api/admin/users`,
        userById: `GET ${baseUrl}/api/admin/users/:id`,
        updateUser: `PUT ${baseUrl}/api/admin/users/:id`,
        deleteUser: `DELETE ${baseUrl}/api/admin/users/:id`
      },
      abstracts: {
        submit: `POST ${baseUrl}/api/abstracts`,
        myAbstracts: `GET ${baseUrl}/api/abstracts/my`,
        byId: `GET ${baseUrl}/api/abstracts/:id`
      }
    }
  });
});

// 6. 404 & Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

