const crypto = require('crypto');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Role = require('./models/Role');
const logger = require('./utils/logger');

const seed = async () => {
  await connectDB();
  await Role.bulkWrite([
    { updateOne: { filter: { name: 'super admin' }, update: { $setOnInsert: { description: 'Full access to all system features.', isSystem: true } }, upsert: true } },
    { updateOne: { filter: { name: 'admin' }, update: { $setOnInsert: { description: 'Administrative access.', isSystem: true } }, upsert: true } },
    { updateOne: { filter: { name: 'user' }, update: { $setOnInsert: { description: 'Standard employee access.', isSystem: true } }, upsert: true } },
  ]);

  const email = process.env.SEED_ADMIN_EMAIL || 'superadmin@erp.local';
  let admin = await User.findOne({ email });
  if (!admin) {
    const generatedPassword = process.env.SEED_ADMIN_PASSWORD || `${crypto.randomBytes(9).toString('base64url')}A1`;
    admin = await User.create({ name: 'System Super Admin', username: 'admin', email, password: generatedPassword, role: 'super admin' });
    logger.warn('Initial super admin created. Store this password securely and rotate it immediately.', { email, generatedPassword });
  } else {
    logger.info('Super admin already exists', { email });
  }
};

seed()
  .then(() => mongoose.connection.close())
  .catch(async (error) => {
    logger.error('Seed failed', { error: error.stack });
    await mongoose.connection.close().catch(() => {});
    process.exitCode = 1;
  });
