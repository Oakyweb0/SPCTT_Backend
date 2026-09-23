import app from './app.js';
import { config } from './config/env.js';
import { initDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

// Server instance - live reload
let server;

async function startServer() {
  try {
    // 1. Initialize Database connection and verify schema
    await initDatabase();

    // 2. Start HTTP Server
    server = app.listen(config.PORT, () => {
      logger.info('======================================================');
      logger.info(` SPCTT 2026 API Server is running on port ${config.PORT}`);
      logger.info(` Environment: ${config.NODE_ENV}`);
      logger.info(` Swagger UI Docs: http://localhost:${config.PORT}/api-docs`);
      logger.info('======================================================');
    });

    // Configure server timeouts for large 20MB file uploads
    server.timeout = 300000; // 5 minutes
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds

    // 3. Graceful Shutdown Handlers
    const shutdown = (signal) => {
      logger.info(`${signal} received: closing HTTP server gracefully...`);
      if (server) {
        server.close(() => {
          logger.info('HTTP server closed.');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

export { app, server };
