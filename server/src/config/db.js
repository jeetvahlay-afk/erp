const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

const connectDB = async () => {
  const connection = await mongoose.connect(env.mongoUri, {
    autoIndex: !env.isProduction,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
    minPoolSize: env.isProduction ? 2 : 0,
  });

  logger.info('MongoDB connected', {
    host: connection.connection.host,
    database: connection.connection.name,
  });

  return connection;
};

module.exports = connectDB;
