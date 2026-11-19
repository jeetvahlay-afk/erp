const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const env = require('../config/env');

const uploadDir = path.resolve(__dirname, '../../uploads/leaves');
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['application/pdf', '.pdf'],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const extension = allowedMimeTypes.get(file.mimetype);
    callback(null, `leave-${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`);
  },
});

const fileFilter = (_req, file, callback) => {
  const expectedExtension = allowedMimeTypes.get(file.mimetype);
  const suppliedExtension = path.extname(file.originalname).toLowerCase();
  if (!expectedExtension || (file.mimetype !== 'image/jpeg' && suppliedExtension !== expectedExtension)) {
    return callback(new Error('Only JPEG, PNG, and PDF files are allowed'));
  }
  return callback(null, true);
};

module.exports = multer({ storage, limits: { fileSize: env.uploadMaxBytes, files: 1 }, fileFilter });
