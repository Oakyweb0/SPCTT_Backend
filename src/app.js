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
    :root, html, body {
      color-scheme: light !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #3b4151 !important;
    }
    body {
      background: #ffffff !important;
      background-color: #ffffff !important;
    }
    .swagger-ui {
      color-scheme: light !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #3b4151 !important;
      font-family: sans-serif !important;
    }
    .swagger-ui .topbar { 
      display: none !important; 
    }
    .swagger-ui .wrapper {
      background: #ffffff !important;
      background-color: #ffffff !important;
    }
    .swagger-ui .scheme-container {
      background: #ffffff !important;
      background-color: #ffffff !important;
      box-shadow: 0 1px 2px 0 rgba(0,0,0,.1) !important;
      padding: 20px 0 !important;
      margin-bottom: 20px !important;
    }
    .swagger-ui .info {
      margin: 20px 0 !important;
    }
    .swagger-ui .info .title {
      color: #3b4151 !important;
      font-family: sans-serif !important;
      font-size: 36px !important;
    }
    .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info table {
      color: #3b4151 !important;
    }
    .swagger-ui .opblock-tag {
      color: #3b4151 !important;
      font-family: sans-serif !important;
      font-size: 24px !important;
      border-bottom: 1px solid rgba(59,65,81,.2) !important;
      padding: 10px 0 !important;
      margin: 20px 0 10px !important;
    }
    .swagger-ui .opblock-tag:hover {
      background: rgba(0,0,0,.02) !important;
    }
    .swagger-ui .opblock {
      margin: 0 0 15px !important;
      border-radius: 4px !important;
      box-shadow: 0 0 3px rgba(0,0,0,.1) !important;
    }
    .swagger-ui .opblock.opblock-post {
      background: rgba(73,204,144,.1) !important;
      border-color: #49cc90 !important;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: #49cc90 !important;
      color: #ffffff !important;
      text-shadow: none !important;
    }
    .swagger-ui .opblock.opblock-get {
      background: rgba(97,175,254,.1) !important;
      border-color: #61affe !important;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: #61affe !important;
      color: #ffffff !important;
      text-shadow: none !important;
    }
    .swagger-ui .opblock.opblock-put {
      background: rgba(252,161,48,.1) !important;
      border-color: #fca130 !important;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary-method {
      background: #fca130 !important;
      color: #ffffff !important;
      text-shadow: none !important;
    }
    .swagger-ui .opblock.opblock-delete {
      background: rgba(249,62,62,.1) !important;
      border-color: #f93e3e !important;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background: #f93e3e !important;
      color: #ffffff !important;
      text-shadow: none !important;
    }
    .swagger-ui .opblock.opblock-patch {
      background: rgba(80,227,194,.1) !important;
      border-color: #50e3c2 !important;
    }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method {
      background: #50e3c2 !important;
      color: #ffffff !important;
      text-shadow: none !important;
    }
    .swagger-ui .opblock-summary-path,
    .swagger-ui .opblock-summary-path__deprecated {
      color: #3b4151 !important;
      font-weight: 600 !important;
    }
    .swagger-ui .opblock-summary-description {
      color: #3b4151 !important;
    }
    .swagger-ui .btn.authorize {
      color: #49cc90 !important;
      border-color: #49cc90 !important;
      background-color: transparent !important;
      border-radius: 4px !important;
      font-weight: 700 !important;
    }
    .swagger-ui .btn.authorize svg {
      fill: #49cc90 !important;
    }
    .swagger-ui select {
      background-color: #ffffff !important;
      color: #3b4151 !important;
      border: 2px solid #41444e !important;
      border-radius: 4px !important;
    }
    .swagger-ui input[type=text], .swagger-ui input[type=password], .swagger-ui textarea {
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #3b4151 !important;
      border: 1px solid #d9d9d9 !important;
    }
    /* Schemas / Models Dark Theme */
    .swagger-ui section.models {
      background: #1e293b !important;
      border: 1px solid #334155 !important;
      border-radius: 8px !important;
      margin: 30px 0 !important;
      padding: 15px !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
    }
    .swagger-ui section.models h4 {
      color: #f1f5f9 !important;
      border-bottom: 1px solid #334155 !important;
      padding-bottom: 10px !important;
      font-weight: 700 !important;
    }
    .swagger-ui section.models h4 svg {
      fill: #f1f5f9 !important;
    }
    .swagger-ui section.models .model-container {
      background: #0f172a !important;
      border: 1px solid #334155 !important;
      border-radius: 6px !important;
      margin: 8px 0 !important;
      padding: 10px !important;
    }
    .swagger-ui section.models .model-box {
      background: #0f172a !important;
      border: none !important;
    }
    .swagger-ui section.models .model-box-control,
    .swagger-ui section.models .model-title,
    .swagger-ui section.models .model-title__text {
      color: #38bdf8 !important;
      font-weight: 600 !important;
    }
    .swagger-ui section.models .model-box-control svg,
    .swagger-ui section.models .model-toggle svg {
      fill: #94a3b8 !important;
    }
    .swagger-ui section.models .model-toggle:after {
      filter: invert(1) !important;
    }
    .swagger-ui section.models .model {
      color: #e2e8f0 !important;
    }
    .swagger-ui section.models .model .property {
      color: #93c5fd !important;
    }
    .swagger-ui section.models .model .property.primitive {
      color: #34d399 !important;
    }
    .swagger-ui section.models .model .brace-open,
    .swagger-ui section.models .model .brace-close {
      color: #f1f5f9 !important;
    }
    .swagger-ui section.models table.model {
      color: #e2e8f0 !important;
    }
    .swagger-ui section.models table.model tr td {
      color: #cbd5e1 !important;
      border-bottom: 1px solid #1e293b !important;
    }
    .swagger-ui section.models .prop-type {
      color: #38bdf8 !important;
    }
    .swagger-ui section.models .prop-format {
      color: #94a3b8 !important;
    }
    .swagger-ui section.models .prop-enum {
      color: #fbbf24 !important;
    }
    .swagger-ui .response-col_status, .swagger-ui .response-col_description {
      color: #3b4151 !important;
    }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th {
      color: #3b4151 !important;
      border-bottom: 1px solid rgba(59,65,81,.2) !important;
    }
    .swagger-ui .tab li button.tablinks {
      color: #3b4151 !important;
    }
    .swagger-ui .view-line-link,
    .swagger-ui .opblock-summary .view-line-link,
    .swagger-ui .opblock-summary button.view-line-link {
      display: none !important;
    }
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

