const { Worker } = require('bullmq');
const { getRedisOptions } = require('../config/redis');
const env = require('../config/env');
const logger = require('../utils/logger');

let emailWorker = null;

const createEmailWorker = () => {
  if (!env.enableRedis) return null;

  try {
    // Lazily require mail services inside the worker to avoid circular dependency
    const { sendSystemEmail } = require('../services/mailService');
    const {
      sendAgreementDispatchEmail,
      sendAgreementSignedConfirmationToRecipient,
      sendAgreementSignedAlertToHR,
    } = require('../services/agreementMailService');

    emailWorker = new Worker(
      'email-queue',
      async (job) => {
        logger.info(`[email-worker] Processing job ${job.id} (${job.name})`);
        const { name, data } = job;

        if (name === 'send-system-email') {
          return await sendSystemEmail(data);
        }

        if (name === 'send-agreement-email') {
          const { type, payload } = data;
          if (type === 'dispatch') {
            return await sendAgreementDispatchEmail(payload);
          }
          if (type === 'signed_recipient') {
            return await sendAgreementSignedConfirmationToRecipient(payload);
          }
          if (type === 'signed_hr') {
            return await sendAgreementSignedAlertToHR(payload);
          }
        }

        throw new Error(`Unknown job name: ${name}`);
      },
      {
        connection: getRedisOptions({ maxRetriesPerRequest: null }),
        concurrency: 3,
        limiter: {
          max: 10,
          duration: 1000, // 10 emails/sec max
        },
      }
    );

    emailWorker.on('completed', (job) => {
      logger.info(`[email-worker] Job ${job.id} completed successfully`);
    });

    emailWorker.on('failed', (job, err) => {
      logger.error(`[email-worker] Job ${job?.id} failed: ${err.message}`, {
        jobName: job?.name,
        attemptsMade: job?.attemptsMade,
      });
    });

    emailWorker.on('error', (err) => {
      logger.warn(`[email-worker] Worker connection error: ${err.message}`);
    });

    return emailWorker;
  } catch (err) {
    logger.warn(`Failed to start emailWorker: ${err.message}`);
    return null;
  }
};

const getEmailWorker = () => emailWorker;

module.exports = {
  createEmailWorker,
  getEmailWorker,
};
