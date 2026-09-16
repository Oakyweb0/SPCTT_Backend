import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import abstractRoutes from './routes/abstractRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Read Swagger specification
const swaggerSpecPath = path.join(__dirname, 'docs', 'swagger.json');
let swaggerSpec = {};
try {
  swaggerSpec = JSON.parse(fs.readFileSync(swaggerSpecPath, 'utf8'));
} catch (err) {
  console.warn('Swagger spec not loaded initially:', err.message);
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI Documentation
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .opblock-tag { font-size: 1.2rem; font-weight: 700; border-bottom: 2px solid #0f4c64; padding-bottom: 5px; margin-top: 25px; }
  `,
  customSiteTitle: 'SPCTT 2026 API Documentation'
};

app.use('/api-docs', swaggerUi.serve, (req, res, next) => {
  try {
    const dynamicSpec = JSON.parse(fs.readFileSync(swaggerSpecPath, 'utf8'));
    swaggerUi.setup(dynamicSpec, swaggerUiOptions)(req, res, next);
  } catch (err) {
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)(req, res, next);
  }
});

app.use('/api/docs', swaggerUi.serve, (req, res, next) => {
  try {
    const dynamicSpec = JSON.parse(fs.readFileSync(swaggerSpecPath, 'utf8'));
    swaggerUi.setup(dynamicSpec, swaggerUiOptions)(req, res, next);
  } catch (err) {
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)(req, res, next);
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/abstracts', abstractRoutes);
app.use('/api/admin', adminRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    status: true,
    message: 'SPCTT 2026 Conference REST API Server is running!',
    documentation: `http://localhost:${PORT}/api-docs`,
    sections: {
      userPortal: {
        register: `POST http://localhost:${PORT}/api/auth/register`,
        login: `POST http://localhost:${PORT}/api/auth/login`,
        categories: `GET http://localhost:${PORT}/api/registration/categories`,
        registrationFlow: `POST http://localhost:${PORT}/api/registration/step1-category`,
        invoices: `GET http://localhost:${PORT}/api/registration/invoices`,
        abstracts: `POST http://localhost:${PORT}/api/abstracts`
      },
      adminPortal: {
        login: `POST http://localhost:${PORT}/api/auth/admin/login`,
        dashboardStats: `GET http://localhost:${PORT}/api/admin/dashboard-stats`,
        registrations: `GET http://localhost:${PORT}/api/admin/registrations`,
        invoices: `GET http://localhost:${PORT}/api/admin/invoices`
      }
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: false,
    message: `Cannot ${req.method} ${req.url}. Route not found.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    status: false,
    message: 'Internal Server Error',
    error: err.message
  });
});

// Start Server and Initialize DB
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 SPCTT 2026 API Server is running on port ${PORT}`);
      console.log(`📖 Swagger UI Docs: http://localhost:${PORT}/api-docs`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
