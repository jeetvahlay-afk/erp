const express = require('express');
const {
  requestBreak,
  getMyRequests,
  getAllRequests,
  updateRequestStatus,
} = require('../controllers/breakRequestController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.post('/', requestBreak);
router.get('/my-requests', getMyRequests);
router.get('/', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['settings.read'] }), getAllRequests);
router.put('/:id', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['settings.write'] }), updateRequestStatus);

module.exports = router;
