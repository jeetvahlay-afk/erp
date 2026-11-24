const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

let sharedClient = null;
let isConnected = false;

const getRedisOptions = (customOverrides = {}) => {
  const options = {
    lazyConnect: true,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      if (!env.enableRedis || env.nodeEnv === 'test') return null;
      if (times > 1) return null; // Stop background retry loop if Redis server is offline
      return 1000;
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((code) => err.message.includes(code));
    },
    ...customOverrides,
  };

  if (env.redisPassword) options.password = env.redisPassword;
  return options;
};

const createRedisClient = (role = 'general', customOverrides = {}) => {
  if (!env.enableRedis) {
    return null;
  }

  const options = getRedisOptions(customOverrides);
  const client = env.redisUrl
    ? new Redis(env.redisUrl, options)
    : new Redis({ host: env.redisHost, port: env.redisPort, ...options });

  client.on('connect', () => {
    logger.info(`Redis [${role}] connected successfully`);
    if (role === 'general') isConnected = true;
  });

  client.on('ready', () => {
    if (role === 'general') isConnected = true;
  });

  client.on('error', (err) => {
    if (role === 'general') isConnected = false;
    // Log as warning rather than crashing if Redis is offline locally
    logger.warn(`Redis [${role}] connection warning: ${err.message}`);
  });

  client.on('close', () => {
    if (role === 'general') isConnected = false;
  });

  return client;
};

const getRedisClient = () => {
  if (!sharedClient && env.enableRedis) {
    sharedClient = createRedisClient('shared');
    sharedClient.connect().catch((err) => {
      logger.warn(`Redis initial connect failed (running in fallback mode): ${err.message}`);
    });
  }
  return sharedClient;
};

const isRedisAvailable = () => isConnected;

const closeRedis = async () => {
  if (sharedClient) {
    try {
      await sharedClient.quit();
    } catch {
      sharedClient.disconnect();
    }
    sharedClient = null;
    isConnected = false;
  }
};

module.exports = {
  createRedisClient,
  getRedisClient,
  isRedisAvailable,
  closeRedis,
  getRedisOptions,
};
