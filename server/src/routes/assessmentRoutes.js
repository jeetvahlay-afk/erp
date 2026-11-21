const express = require('express');
const router = express.Router();
const upload = require('../middleware/documentUploadMiddleware');
const assessmentController = require('../controllers/assessmentController');
const env = require('../config/env');
const AppError = require('../utils/AppError');

// API Key verification middleware for dedicated assessment portal
const requireAssessmentApiKey = (req, res, next) => {
  const configuredKey = env.assessmentApiKey;
  if (!configuredKey) return next();

  const clientKey = req.headers['x-assessment-api-key'] || req.headers['x-api-key'] || req.query.apiKey;
  if (clientKey && clientKey === configuredKey) {
    return next();
  }

  if (process.env.NODE_ENV !== 'production' && !clientKey) {
    return next();
  }

  return next(new AppError('Invalid or missing assessment API key. Access denied.', 401, 'INVALID_API_KEY'));
};

router.use(requireAssessmentApiKey);

// Metadata (positions, drive locations, departments)
router.get('/metadata', assessmentController.getMetadata);

// Verify & lookup existing candidate in Daily Candidate Update by Email + Mobile Number
router.post('/lookup-daily-candidate', assessmentController.lookupDailyCandidate);

// Candidate Registration (with optional CV upload)
router.post('/register', upload.single('cv'), assessmentController.registerCandidate);

// Gmail Confirmation / OTP Verification (Assessment Stage 2)
router.post('/verify-email', assessmentController.verifyEmail);
router.post('/resend-otp', assessmentController.resendVerificationOtp);

// Desk Sign-In (with Gmail & password)
router.post('/login', assessmentController.loginCandidate);

// Assessment Intro & rules
router.get('/:candidateCode/intro', assessmentController.getAssessmentIntro);

// Start or resume assessment & get questions (stripping correct answers)
router.get('/:candidateCode/exam', assessmentController.startOrGetExam);

// Realtime save individual answer
router.post('/:candidateCode/answer', assessmentController.saveAnswer);

// Tab switch detection (anti-cheat: triggers auto-submit on 3 switches)
router.post('/:candidateCode/tab-switch', assessmentController.recordTabSwitch);

// Final Submit
router.post('/:candidateCode/submit', assessmentController.submitAssessment);

// Result page
router.get('/:candidateCode/result', assessmentController.getAssessmentResult);

module.exports = router;
