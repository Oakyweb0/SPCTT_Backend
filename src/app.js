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
  limit: '25mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

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
      color: #1e293b !important;
    }
    body {
      background: #ffffff !important;
      background-color: #ffffff !important;
    }
    .swagger-ui {
      color-scheme: light !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #1e293b !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    }
    .swagger-ui .topbar { 
      display: none !important; 
    }
    .swagger-ui .wrapper {
      background: #ffffff !important;
      background-color: #ffffff !important;
    }
    .swagger-ui .scheme-container {
      background: #f8fafc !important;
      background-color: #f8fafc !important;
      box-shadow: 0 1px 3px 0 rgba(0,0,0,.08) !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8px !important;
      padding: 16px 20px !important;
      margin-bottom: 24px !important;
    }
    .swagger-ui .info {
      margin: 24px 0 !important;
    }
    .swagger-ui .info .title {
      color: #0f172a !important;
      font-size: 32px !important;
      font-weight: 700 !important;
    }
    .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info table {
      color: #334155 !important;
      font-size: 14px !important;
    }
    .swagger-ui .opblock-tag {
      color: #0f172a !important;
      font-size: 22px !important;
      font-weight: 700 !important;
      border-bottom: 2px solid #e2e8f0 !important;
      padding: 12px 0 8px 0 !important;
      margin: 28px 0 12px !important;
    }
    .swagger-ui .opblock-tag:hover {
      background: rgba(0,0,0,.02) !important;
    }
    .swagger-ui .opblock {
      margin: 0 0 14px !important;
      border-radius: 8px !important;
      box-shadow: 0 1px 3px rgba(0,0,0,.06) !important;
      border-width: 1px !important;
    }
    .swagger-ui .opblock.opblock-post {
      background: rgba(16, 185, 129, .06) !important;
      border-color: #10b981 !important;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: #10b981 !important;
      color: #ffffff !important;
      text-shadow: none !important;
      border-radius: 4px !important;
      font-weight: 700 !important;
    }
    .swagger-ui .opblock.opblock-get {
      background: rgba(59, 130, 246, .06) !important;
      border-color: #3b82f6 !important;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: #3b82f6 !important;
      color: #ffffff !important;
      text-shadow: none !important;
      border-radius: 4px !important;
      font-weight: 700 !important;
    }
    .swagger-ui .opblock.opblock-put {
      background: rgba(245, 158, 11, .06) !important;
      border-color: #f59e0b !important;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary-method {
      background: #f59e0b !important;
      color: #ffffff !important;
      text-shadow: none !important;
      border-radius: 4px !important;
      font-weight: 700 !important;
    }
    .swagger-ui .opblock.opblock-delete {
      background: rgba(239, 68, 68, .06) !important;
      border-color: #ef4444 !important;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background: #ef4444 !important;
      color: #ffffff !important;
      text-shadow: none !important;
      border-radius: 4px !important;
      font-weight: 700 !important;
    }
    .swagger-ui .opblock.opblock-patch {
      background: rgba(14, 165, 233, .06) !important;
      border-color: #0ea5e9 !important;
    }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method {
      background: #0ea5e9 !important;
      color: #ffffff !important;
      text-shadow: none !important;
      border-radius: 4px !important;
      font-weight: 700 !important;
    }
    .swagger-ui .opblock-summary-path,
    .swagger-ui .opblock-summary-path__deprecated {
      color: #0f172a !important;
      font-weight: 600 !important;
      font-size: 15px !important;
    }
    .swagger-ui .opblock-summary-description {
      color: #475569 !important;
      font-size: 13px !important;
    }
    /* Opblock Details & Description Text Fix */
    .swagger-ui .opblock-description-wrapper,
    .swagger-ui .opblock-description-wrapper p,
    .swagger-ui .opblock-description,
    .swagger-ui .opblock-description p,
    .swagger-ui .opblock-external-docs-wrapper,
    .swagger-ui .opblock-external-docs-wrapper p,
    .swagger-ui .opblock-title_normal,
    .swagger-ui .opblock-title_normal p,
    .swagger-ui .renderedMarkdown,
    .swagger-ui .renderedMarkdown p,
    .swagger-ui .markdown,
    .swagger-ui .markdown p {
      color: #1e293b !important;
      font-size: 14px !important;
      line-height: 1.6 !important;
    }
    .swagger-ui .renderedMarkdown code,
    .swagger-ui .markdown code {
      background: #f1f5f9 !important;
      color: #0f172a !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
      border: 1px solid #cbd5e1 !important;
      font-size: 12px !important;
    }
    .swagger-ui .opblock-section-header {
      background: #f8fafc !important;
      border-top: 1px solid #e2e8f0 !important;
      border-bottom: 1px solid #e2e8f0 !important;
      padding: 8px 16px !important;
    }
    .swagger-ui .opblock-section-header h4 {
      color: #0f172a !important;
      font-weight: 700 !important;
      font-size: 14px !important;
    }
    .swagger-ui .parameters-col_name,
    .swagger-ui .parameters-col_description,
    .swagger-ui .parameter__name,
    .swagger-ui .parameter__type,
    .swagger-ui .parameter__in {
      color: #1e293b !important;
    }
    .swagger-ui .parameter__name.required:after {
      color: #ef4444 !important;
    }
    .swagger-ui .btn.authorize {
      color: #10b981 !important;
      border-color: #10b981 !important;
      background-color: transparent !important;
      border-radius: 6px !important;
      font-weight: 700 !important;
      padding: 6px 16px !important;
      transition: all 0.2s ease !important;
    }
    .swagger-ui .btn.authorize:hover {
      background-color: #10b981 !important;
      color: #ffffff !important;
    }
    .swagger-ui .btn.authorize:hover svg {
      fill: #ffffff !important;
    }
    .swagger-ui .btn.authorize svg {
      fill: #10b981 !important;
    }
    .swagger-ui select {
      background-color: #ffffff !important;
      color: #0f172a !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 6px !important;
      padding: 6px 10px !important;
    }
    .swagger-ui input[type=text], .swagger-ui input[type=password], .swagger-ui textarea {
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #0f172a !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 6px !important;
      padding: 8px 12px !important;
    }
    .swagger-ui input[type=text]:focus, .swagger-ui input[type=password]:focus, .swagger-ui textarea:focus {
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
      outline: none !important;
    }
    /* ======================================================== */
    /* AVAILABLE AUTHORIZATIONS MODAL STYLING                   */
    /* ======================================================== */
    .swagger-ui .dialog-ux .backdrop-ux {
      background: rgba(15, 23, 42, 0.75) !important;
      backdrop-filter: blur(4px) !important;
    }
    .swagger-ui .dialog-ux .modal-ux {
      background: #ffffff !important;
      background-color: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 12px !important;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
      max-width: 620px !important;
      overflow: hidden !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header {
      background: #f8fafc !important;
      border-bottom: 1px solid #e2e8f0 !important;
      padding: 16px 24px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header h3 {
      color: #0f172a !important;
      font-size: 18px !important;
      font-weight: 700 !important;
      margin: 0 !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header .close-modal {
      color: #64748b !important;
      fill: #64748b !important;
      padding: 6px !important;
      cursor: pointer !important;
      background: transparent !important;
      border: none !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header .close-modal:hover {
      color: #0f172a !important;
      fill: #0f172a !important;
    }
    .swagger-ui .dialog-ux .modal-ux-content {
      background: #ffffff !important;
      background-color: #ffffff !important;
      padding: 24px !important;
      color: #1e293b !important;
    }
    .swagger-ui .dialog-ux .modal-ux-content h4 {
      color: #0f172a !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      margin-bottom: 10px !important;
    }
    .swagger-ui .dialog-ux .modal-ux-content p {
      color: #334155 !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
      margin: 6px 0 14px 0 !important;
    }
    .swagger-ui .dialog-ux .modal-ux-content code {
      background: #f1f5f9 !important;
      color: #0284c7 !important;
      padding: 3px 7px !important;
      border-radius: 4px !important;
      border: 1px solid #cbd5e1 !important;
      font-family: Consolas, Monaco, "Courier New", monospace !important;
      font-size: 13px !important;
      font-weight: 600 !important;
    }
    .swagger-ui .auth-container {
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
    }
    .swagger-ui .auth-container .wrapper {
      padding: 0 !important;
      margin-bottom: 18px !important;
    }
    .swagger-ui .auth-container label {
      color: #1e293b !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      margin-bottom: 8px !important;
      display: inline-block !important;
    }
    .swagger-ui .auth-container input[type=text],
    .swagger-ui .auth-container input[type=password] {
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #0f172a !important;
      border: 1.5px solid #cbd5e1 !important;
      border-radius: 8px !important;
      padding: 10px 14px !important;
      font-size: 14px !important;
      width: 100% !important;
      box-sizing: border-box !important;
      outline: none !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
    }
    .swagger-ui .auth-container input[type=text]:focus,
    .swagger-ui .auth-container input[type=password]:focus {
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
    }
    .swagger-ui .auth-btn-wrapper {
      display: flex !important;
      gap: 12px !important;
      justify-content: flex-end !important;
      margin-top: 24px !important;
      padding: 0 !important;
    }
    .swagger-ui .btn.modal-btn {
      border-radius: 8px !important;
      padding: 9px 22px !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
    }
    .swagger-ui .btn.modal-btn.auth {
      background: #10b981 !important;
      color: #ffffff !important;
      border: 1px solid #10b981 !important;
    }
    .swagger-ui .btn.modal-btn.auth:hover {
      background: #059669 !important;
      border-color: #059669 !important;
    }
    .swagger-ui .btn.modal-btn.auth.logout {
      background: #ef4444 !important;
      color: #ffffff !important;
      border: 1px solid #ef4444 !important;
    }
    .swagger-ui .btn.modal-btn.auth.logout:hover {
      background: #dc2626 !important;
      border-color: #dc2626 !important;
    }
    .swagger-ui .btn.modal-btn.btn-done {
      background: #f1f5f9 !important;
      color: #334155 !important;
      border: 1px solid #cbd5e1 !important;
    }
    .swagger-ui .btn.modal-btn.btn-done:hover {
      background: #e2e8f0 !important;
      color: #0f172a !important;
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
      color: #1e293b !important;
    }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th {
      color: #1e293b !important;
      border-bottom: 1px solid rgba(59,65,81,.2) !important;
    }
    .swagger-ui .tab li button.tablinks {
      color: #1e293b !important;
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

