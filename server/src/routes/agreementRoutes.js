const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const {
  getAllAgreements,
  getAgreementById,
  getPublicAgreement,
  createOrUpdateAgreement,
  signAgreement,
  resendAgreementEmail,
  deleteAgreement,
  uploadAgreementDoc,
  getAgreementStats,
} = require('../controllers/agreementController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');
const AppError = require('../utils/AppError');

const router = express.Router();

const uploadDir = path.resolve(__dirname, '../../uploads/documents/agreements');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doc-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF, JPG, PNG, and WebP files are allowed for agreements', 400, 'INVALID_FILE_TYPE'));
    }
  },
});

// Public routes for candidate online viewing and signing
router.get('/public/:id', getPublicAgreement);
router.post('/public/:id/sign', signAgreement);

// Protected routes for administration and recruitment management
router.use(protect);

router.get(
  '/stats',
  authorizeAccess({ roles: ['admin', 'super admin', 'hr', 'recruiter'], permissions: ['recruitment.read'] }),
  getAgreementStats
);

router.get(
  '/',
  authorizeAccess({ roles: ['admin', 'super admin', 'hr', 'recruiter'], permissions: ['recruitment.read'] }),
  getAllAgreements
);

router.get(
  '/:id',
  authorizeAccess({ roles: ['admin', 'super admin', 'hr', 'recruiter'], permissions: ['recruitment.read'] }),
  getAgreementById
);

router.post(
  '/upload-doc',
  authorizeAccess({ roles: ['admin', 'super admin', 'hr', 'recruiter'], permissions: ['recruitment.write'] }),
  upload.single('file'),
  uploadAgreementDoc
);

router.post(
  '/',
  authorizeAccess({ roles: ['admin', 'super admin', 'hr', 'recruiter'], permissions: ['recruitment.write'] }),
  createOrUpdateAgreement
);

router.put(
  '/:id',
  authorizeAccess({ roles: ['admin', 'super admin', 'hr', 'recruiter'], permissions: ['recruitment.write'] }),
  createOrUpdateAgreement
);

router.post(
  '/:id/resend-email',
  authorizeAccess({ roles: ['admin', 'super admin', 'hr', 'recruiter'], permissions: ['recruitment.write'] }),
  resendAgreementEmail
);

router.delete(
  '/:id',
  authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['recruitment.write'] }),
  deleteAgreement
);

module.exports = router;
