const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.resolve(__dirname, '../../uploads/chat');
fs.mkdirSync(uploadDir, { recursive: true });

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const FILE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const ext = EXTENSIONS[file.mimetype] || path.extname(file.originalname).toLowerCase();
    callback(null, `chat-${Date.now()}-${crypto.randomBytes(10).toString('hex')}${ext}`);
  },
});

const fileFilter = (_req, file, callback) => {
  if (!FILE_MIMES.has(file.mimetype)) {
    return callback(new Error('Unsupported file type'));
  }
  return callback(null, true);
};

module.exports = {
  upload: multer({ storage, limits: { fileSize: 10 * 1024 * 1024, files: 1 }, fileFilter }),
  isImage: (mime) => IMAGE_MIMES.has(mime),
};
