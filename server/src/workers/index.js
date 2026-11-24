const { createEmailWorker, getEmailWorker } = require('./emailWorker');
const { createSchedulerWorker, getSchedulerWorker } = require('./schedulerWorker');
const { setupRepeatableJobs } = require('../queues/schedulerQueue');
const env = require('../config/env');
const logger = require('../utils/logger');

let initialized = false;

const initWorkers = async () => {
  if (initialized || !env.enableRedis) return;
  initialized = true;

  try {
    createEmailWorker();
    createSchedulerWorker();
    await setupRepeatableJobs();
    logger.info('Background BullMQ workers & repeatable scheduler initialized');
  } catch (err) {
    logger.warn(`Background worker initialization warning: ${err.message}`);
  }
};

const closeWorkers = async () => {
  const emailWorker = getEmailWorker();
  const schedulerWorker = getSchedulerWorker();

  await Promise.allSettled([
    emailWorker ? emailWorker.close() : Promise.resolve(),
    schedulerWorker ? schedulerWorker.close() : Promise.resolve(),
  ]);

  logger.info('BullMQ workers shutdown cleanly');
};

module.exports = {
  initWorkers,
  closeWorkers,
};
