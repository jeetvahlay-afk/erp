const http = require('http');
const mongoose = require('mongoose');
const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const logger = require('./utils/logger');

let server;

const shutdown = async (signal, exitCode = 0) => {
  logger.info('Shutdown initiated', { signal });
  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.connection.close(false);
  clearTimeout(forceExit);
  process.exit(exitCode);
};

const start = async () => {
  await connectDB();
  server = http.createServer(app);
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 30000;
  server.listen(env.port, () => logger.info('ERP API started', { port: env.port, environment: env.nodeEnv }));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: reason?.stack || String(reason) });
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.stack });
  shutdown('uncaughtException', 1);
});

start().catch((error) => {
  logger.error('Failed to start ERP API', { error: error.stack });
  process.exit(1);
});
