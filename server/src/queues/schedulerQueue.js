const { Queue } = require('bullmq');
const { getRedisOptions } = require('../config/redis');
const env = require('../config/env');
const logger = require('../utils/logger');

let schedulerQueue = null;

const getSchedulerQueue = () => {
  if (!schedulerQueue && env.enableRedis) {
    try {
      schedulerQueue = new Queue('scheduler-queue', {
        connection: getRedisOptions({ maxRetriesPerRequest: null }),
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'fixed', delay: 5000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      });

      schedulerQueue.on('error', (err) => {
        logger.warn(`BullMQ scheduler-queue connection warning: ${err.message}`);
      });
    } catch (err) {
      logger.warn(`Failed to initialize BullMQ scheduler-queue: ${err.message}`);
    }
  }
  return schedulerQueue;
};

const setupRepeatableJobs = async () => {
  const queue = getSchedulerQueue();
  if (!queue) return;

  try {
    // Schedule auto-resolution of missing punches every 15 minutes
    await queue.add(
      'auto-resolve-missing-punches',
      {},
      {
        jobId: 'repeatable-auto-resolve-missing-punches',
        repeat: { pattern: '*/15 * * * *' },
      }
    );

    // Schedule training milestone & probation check every 30 minutes
    await queue.add(
      'check-training-milestones',
      {},
      {
        jobId: 'repeatable-check-training-milestones',
        repeat: { pattern: '*/30 * * * *' },
      }
    );

    // Schedule birthday check daily at 08:00 IST (02:30 UTC)
    await queue.add(
      'check-birthdays',
      {},
      {
        jobId: 'repeatable-check-birthdays',
        repeat: { pattern: '30 2 * * *' },
      }
    );

    logger.info('BullMQ repeatable jobs registered successfully');
  } catch (err) {
    logger.warn(`Failed to register BullMQ repeatable jobs: ${err.message}`);
  }
};

module.exports = {
  getSchedulerQueue,
  setupRepeatableJobs,
};
