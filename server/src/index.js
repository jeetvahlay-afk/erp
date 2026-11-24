const http = require('http');
const mongoose = require('mongoose');
const env = require('./config/env');
const connectDB = require('./config/db');
const { closeRedis } = require('./config/redis');
const { initWorkers, closeWorkers } = require('./workers');
const app = require('./app');
const logger = require('./utils/logger');

let server;
let isShuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('Shutdown initiated', { signal });

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
  forceExit.unref();

  try {
    if (server && server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  } catch (err) {
    logger.error('Error closing HTTP server during shutdown', { error: err.message });
  }

  try {
    await closeWorkers();
    await closeRedis();
  } catch (err) {
    logger.warn('Error closing workers/Redis during shutdown', { error: err.message });
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
    }
  } catch (err) {
    logger.error('Error closing MongoDB connection during shutdown', { error: err.message });
  }

  clearTimeout(forceExit);
  process.exit(exitCode);
};

const start = async () => {
  await connectDB();
  await initWorkers();
  server = http.createServer(app);
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 30000;

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${env.port} is already in use by another process!`, {
        code: error.code,
        port: env.port,
        hint: `Another instance of the ERP API or another application is using port ${env.port}. Please stop that process or change PORT in server/.env.`,
      });
    } else {
      logger.error('HTTP server encountered an error', { error: error.stack || error.message });
    }
    process.exit(1);
  });

  server.listen(env.port, () => logger.info('ERP API started', { port: env.port, environment: env.nodeEnv }));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Clean reload handling for nodemon
process.once('SIGUSR2', async () => {
  if (server && server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  process.kill(process.pid, 'SIGUSR2');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection caught', { reason: reason?.stack || String(reason) });
  // Do not kill the entire server process on non-critical unhandled rejections during runtime
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.stack });
  shutdown('uncaughtException', 1);
});

start().catch((error) => {
  logger.error('Failed to start ERP API', { error: error.stack });
  process.exit(1);
});
