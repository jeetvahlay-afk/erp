const { Worker } = require('bullmq');
const { getRedisOptions } = require('../config/redis');
const env = require('../config/env');
const logger = require('../utils/logger');
const User = require('../models/User');
const Notification = require('../models/Notification');

let schedulerWorker = null;

const createSchedulerWorker = () => {
  if (!env.enableRedis) return null;

  try {
    const {
      checkTrainingDay8Milestones,
      checkProbation3MonthMilestones,
    } = require('../services/trainingMilestoneService');
    const { dispatchNotifications } = require('../services/notificationService');

    schedulerWorker = new Worker(
      'scheduler-queue',
      async (job) => {
        logger.info(`[scheduler-worker] Executing scheduled job ${job.name}`);

        if (job.name === 'auto-resolve-missing-punches') {
          const { autoResolveMissingPunches } = require('../controllers/attendanceController');
          await autoResolveMissingPunches();
          return { status: 'missing_punches_resolved' };
        }

        if (job.name === 'check-training-milestones') {
          await checkTrainingDay8Milestones();
          await checkProbation3MonthMilestones();
          return { status: 'milestones_evaluated' };
        }

        if (job.name === 'check-birthdays') {
          const now = new Date();
          const dayKey = now.toISOString().slice(0, 10);
          const users = await User.find({ deletedAt: null, isActive: true, dob: { $ne: null } })
            .select('name dob')
            .lean();

          const celebrants = users.filter((u) => {
            const dob = new Date(u.dob);
            return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate();
          });

          if (celebrants.length > 0) {
            const names = celebrants.map((u) => u.name).join(', ');
            // Notify all active employees about today's birthdays
            const activeUserIds = await User.find({ deletedAt: null, isActive: true }).distinct('_id');
            await dispatchNotifications({
              recipients: activeUserIds,
              title: "Today's Birthday Celebrations!",
              message: `Wishing a very Happy Birthday to: ${names}!`,
              type: 'info',
              link: '/birthdays',
              metadata: { category: 'birthday', day: dayKey },
            });
          }
          return { status: 'birthdays_processed', count: celebrants.length };
        }

        throw new Error(`Unknown scheduler job: ${job.name}`);
      },
      {
        connection: getRedisOptions({ maxRetriesPerRequest: null }),
        concurrency: 1,
      }
    );

    schedulerWorker.on('completed', (job) => {
      logger.info(`[scheduler-worker] Scheduled job ${job.name} finished successfully`);
    });

    schedulerWorker.on('failed', (job, err) => {
      logger.error(`[scheduler-worker] Scheduled job ${job?.name} failed: ${err.message}`);
    });

    schedulerWorker.on('error', (err) => {
      logger.warn(`[scheduler-worker] Worker connection error: ${err.message}`);
    });

    return schedulerWorker;
  } catch (err) {
    logger.warn(`Failed to start schedulerWorker: ${err.message}`);
    return null;
  }
};

const getSchedulerWorker = () => schedulerWorker;

module.exports = {
  createSchedulerWorker,
  getSchedulerWorker,
};
