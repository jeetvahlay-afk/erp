const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const {
  getInterviews,
  getInterviewById,
  createInterview,
  updateInterview,
  deleteInterview,
  decideProbation,
  uploadCandidateCv,
} = require('../controllers/interviewController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

const uploadDir = path.resolve(__dirname, '../../uploads/documents/resumes');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cv-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const ALLOWED_CV_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.rtf', '.txt', '.png', '.jpg', '.jpeg']);
const ALLOWED_CV_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
  'text/rtf',
  'text/plain',
  'image/png',
  'image/jpeg',
]);

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_CV_EXTENSIONS.has(ext) && (ALLOWED_CV_MIME_TYPES.has(file.mimetype) || file.mimetype === 'application/octet-stream')) {
      cb(null, true);
    } else {
      cb(new Error('Only document files (.pdf, .doc, .docx, .rtf, .txt, .png, .jpg) are allowed for CV upload'));
    }
  },
});

const roles = ['admin', 'super admin', 'recruiter', 'hr'];
router.use(protect);
router.get('/', authorizeAccess({ roles, permissions: ['recruitment.read'] }), getInterviews);
router.get('/candidates', authorizeAccess({ roles, permissions: ['recruitment.read'] }), getInterviews);
router.get('/:id', authorizeAccess({ roles, permissions: ['recruitment.read'] }), getInterviewById);
router.post(
  '/upload-cv',
  authorizeAccess({ roles, permissions: ['recruitment.write', 'recruitment.create'] }),
  upload.single('file'),
  uploadCandidateCv
);
router.post('/', authorizeAccess({ roles, permissions: ['recruitment.create'] }), createInterview);
router.post('/:id/probation-decision', authorizeAccess({ roles, permissions: ['recruitment.write'] }), decideProbation);
router.put('/:id', authorizeAccess({ roles, permissions: ['recruitment.write'] }), updateInterview);
router.delete('/:id', authorizeAccess({ roles, permissions: ['recruitment.delete'] }), deleteInterview);

module.exports = router;
