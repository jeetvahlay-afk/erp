const { RedisStore } = require('rate-limit-redis');
const { getRedisClient, isRedisAvailable } = require('../config/redis');
const logger = require('../utils/logger');

const createRateLimitStore = (prefix = 'rl:general:') => {
  try {
    const redis = getRedisClient();
    if (!redis || !isRedisAvailable() || redis.status !== 'ready') {
      return undefined;
    }

    return new RedisStore({
      sendCommand: async (...args) => {
        try {
          if (!isRedisAvailable() || redis.status !== 'ready') {
            return undefined;
          }
          return await redis.call(...args);
        } catch (err) {
          logger.warn(`Redis rate limit error: ${err.message}`);
          return undefined;
        }
      },
      prefix,
    });
  } catch (err) {
    logger.warn(`Failed to initialize RedisRateLimitStore, using memory fallback: ${err.message}`);
    return undefined;
  }
};

module.exports = { createRateLimitStore };
