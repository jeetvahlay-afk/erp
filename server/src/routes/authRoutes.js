const express = require('express');
const { registerUser, loginUser, getMe, verifyCredentials, logoutUser, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');
const avatarUpload = require('../middleware/avatarUploadMiddleware');

const router = express.Router();

router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.post('/verify', protect, verifyCredentials);
router.post('/logout', protect, logoutUser);
router.post('/register', protect, authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['employees.create'] }), avatarUpload.single('profileImage'), registerUser);

module.exports = router;
