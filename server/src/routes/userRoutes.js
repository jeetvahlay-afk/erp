const express = require('express');
const {
  getUsers, deleteUser, updateUserStatus, updateUser, getUserProfile,
  updateUserProfile, getUserById, getUserAvatar, uploadProfileAvatar, uploadMyDocument, bulkUpdateShift,
  getMyPreferences, updateMyPreferences, uploadUserDocument, downloadUserDocument, deleteUserDocument,
} = require('../controllers/userController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');
const avatarUpload = require('../middleware/avatarUploadMiddleware');
const documentUpload = require('../middleware/documentUploadMiddleware');

const router = express.Router();

router.use(protect);
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.post('/profile/avatar', avatarUpload.single('profileImage'), uploadProfileAvatar);
router.post('/profile/documents', documentUpload.single('document'), uploadMyDocument);
router.get('/preferences/me', getMyPreferences);
router.patch('/preferences/me', updateMyPreferences);
router.get('/:id/avatar', getUserAvatar);
router.post('/bulk-shift', authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['employees.write'] }), bulkUpdateShift);
router.get('/', authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['employees.read'] }), getUsers);
router.get('/:id', authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['employees.read'] }), getUserById);
router.delete('/:id', authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['employees.delete'] }), deleteUser);
router.patch('/:id/status', authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['employees.write'] }), updateUserStatus);
router.put('/:id', authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['employees.write'] }), updateUser);

// User Document Management
router.post('/:id/documents', authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['employees.write'] }), documentUpload.single('document'), uploadUserDocument);
router.get('/:id/documents/:docId', downloadUserDocument);
router.delete('/:id/documents/:docId', authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['employees.write'] }), deleteUserDocument);

module.exports = router;
