const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const env = require('../config/env');

const uploadDir = path.resolve(__dirname, '../../uploads/avatars');
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => callback(null, `avatar-${Date.now()}-${crypto.randomBytes(12).toString('hex')}${allowedMimeTypes.get(file.mimetype)}`),
});

const fileFilter = (_req, file, callback) => {
  if (!allowedMimeTypes.has(file.mimetype)) return callback(new Error('Only JPEG, PNG, and WebP profile images are allowed'));
  return callback(null, true);
};

module.exports = multer({ storage, limits: { fileSize: Math.min(env.uploadMaxBytes, 4 * 1024 * 1024), files: 1 }, fileFilter });
