const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const env = require('../config/env');

const uploadDir = path.resolve(__dirname, '../../uploads/documents');
fs.mkdirSync(uploadDir, { recursive: true });
const allowed = new Map([['application/pdf', '.pdf'], ['image/jpeg', '.jpg'], ['image/png', '.png'], ['text/plain', '.txt']]);
const storage = multer.diskStorage({ destination: (_req, _file, cb) => cb(null, uploadDir), filename: (_req, file, cb) => cb(null, `document-${Date.now()}-${crypto.randomBytes(12).toString('hex')}${allowed.get(file.mimetype)}`) });
const fileFilter = (_req, file, cb) => allowed.has(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF, JPEG, PNG, and text documents are allowed'));
module.exports = multer({ storage, limits: { fileSize: env.uploadMaxBytes, files: 1 }, fileFilter });
