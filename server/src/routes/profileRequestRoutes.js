const express = require('express');
const {
  createProfileRequest,
  getMyProfileRequests,
  getAllProfileRequests,
  updateProfileRequestStatus,
} = require('../controllers/profileRequestController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.post('/', createProfileRequest);
router.get('/my', getMyProfileRequests);
router.get('/', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['employees.write'] }), getAllProfileRequests);
router.put('/:id', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['employees.write'] }), updateProfileRequestStatus);

module.exports = router;
