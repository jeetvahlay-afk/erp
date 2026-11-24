const { Queue } = require('bullmq');
const { getRedisOptions } = require('../config/redis');
const env = require('../config/env');
const logger = require('../utils/logger');

let emailQueue = null;

const getEmailQueue = () => {
  if (!emailQueue && env.enableRedis) {
    try {
      emailQueue = new Queue('email-queue', {
        connection: getRedisOptions({ maxRetriesPerRequest: null }),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: { age: 24 * 3600, count: 1000 },
          removeOnFail: { age: 7 * 24 * 3600, count: 5000 },
        },
      });

      emailQueue.on('error', (err) => {
        logger.warn(`BullMQ email-queue connection warning: ${err.message}`);
      });
    } catch (err) {
      logger.warn(`Failed to initialize BullMQ email-queue: ${err.message}`);
    }
  }
  return emailQueue;
};

const addEmailJob = async (name, data, opts = {}) => {
  const queue = getEmailQueue();
  if (queue) {
    try {
      return await queue.add(name, data, opts);
    } catch (err) {
      logger.warn(`Failed to enqueue job [${name}] to BullMQ: ${err.message}. Invoking fallback execution.`);
    }
  }
  return null;
};

module.exports = {
  getEmailQueue,
  addEmailJob,
};
