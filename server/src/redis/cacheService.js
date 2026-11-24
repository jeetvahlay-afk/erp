const { getRedisClient, isRedisAvailable } = require('../config/redis');
const logger = require('../utils/logger');

const get = async (key) => {
  const client = getRedisClient();
  if (!client || client.status !== 'ready') return null;

  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn(`Redis cache get error for key ${key}: ${err.message}`);
    return null;
  }
};

const set = async (key, value, ttlSeconds = 60) => {
  const client = getRedisClient();
  if (!client || client.status !== 'ready') return false;

  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await client.setex(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
    return true;
  } catch (err) {
    logger.warn(`Redis cache set error for key ${key}: ${err.message}`);
    return false;
  }
};

const del = async (key) => {
  const client = getRedisClient();
  if (!client || client.status !== 'ready') return false;

  try {
    await client.del(key);
    return true;
  } catch (err) {
    logger.warn(`Redis cache del error for key ${key}: ${err.message}`);
    return false;
  }
};

const invalidatePrefix = async (prefix) => {
  const client = getRedisClient();
  if (!client || client.status !== 'ready') return;

  try {
    const stream = client.scanStream({ match: `${prefix}*`, count: 100 });
    stream.on('data', async (keys) => {
      if (keys.length) {
        const pipeline = client.pipeline();
        keys.forEach((k) => pipeline.del(k));
        await pipeline.exec();
      }
    });
  } catch (err) {
    logger.warn(`Redis invalidatePrefix error for ${prefix}: ${err.message}`);
  }
};

const withCache = async (key, ttlSeconds, fetchFn) => {
  const cached = await get(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const fresh = await fetchFn();
  if (fresh !== null && fresh !== undefined) {
    set(key, fresh, ttlSeconds).catch(() => {});
  }
  return fresh;
};

module.exports = {
  get,
  set,
  del,
  invalidatePrefix,
  withCache,
};
