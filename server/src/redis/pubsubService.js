const EventEmitter = require('events');
const { createRedisClient, isRedisAvailable } = require('../config/redis');
const logger = require('../utils/logger');
const env = require('../config/env');

const localBus = new EventEmitter();
let pubClient = null;
let subClient = null;
const registeredChannels = new Set();

const initPubSub = async () => {
  if (!env.enableRedis || pubClient) return;

  try {
    pubClient = createRedisClient('pub');
    subClient = createRedisClient('sub');

    if (pubClient && subClient) {
      await Promise.all([
        pubClient.connect().catch((e) => logger.warn(`PubClient offline: ${e.message}`)),
        subClient.connect().catch((e) => logger.warn(`SubClient offline: ${e.message}`)),
      ]);

      subClient.on('message', (channel, message) => {
        try {
          const parsed = JSON.parse(message);
          localBus.emit(channel, parsed);
        } catch {
          localBus.emit(channel, message);
        }
      });
    }
  } catch (err) {
    logger.warn(`Redis PubSub initialization warning: ${err.message}`);
  }
};

const publishEvent = async (channel, data) => {
  // Always trigger local bus so same-process listeners get the event immediately
  localBus.emit(channel, data);

  // If Redis pubClient is ready, broadcast to all other instances
  if (pubClient && pubClient.status === 'ready') {
    try {
      await pubClient.publish(channel, JSON.stringify(data));
    } catch (err) {
      logger.warn(`Failed to broadcast message to Redis channel ${channel}: ${err.message}`);
    }
  }
};

const subscribeEvent = async (channel, callback) => {
  localBus.on(channel, callback);

  if (!registeredChannels.has(channel)) {
    registeredChannels.add(channel);
    if (!subClient) {
      initPubSub().catch(() => {});
    }
    if (subClient && subClient.status === 'ready') {
      try {
        await subClient.subscribe(channel);
      } catch (err) {
        logger.warn(`Failed to subscribe to Redis channel ${channel}: ${err.message}`);
      }
    }
  }

  return () => {
    localBus.off(channel, callback);
  };
};

module.exports = {
  initPubSub,
  publishEvent,
  subscribeEvent,
};
