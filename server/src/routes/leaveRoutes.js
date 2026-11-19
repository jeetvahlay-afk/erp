const express = require('express');
const {
  getAllLeaves, updateLeaveStatus, applyLeave, getMyLeaves, downloadAttachment,
} = require('../controllers/leaveController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);
router.post('/', upload.single('attachment'), applyLeave);
router.get('/my-leaves', getMyLeaves);
router.get('/:id/attachment', downloadAttachment);
router.get('/', authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['leaves.read'] }), getAllLeaves);
router.put('/:id/status', authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['leaves.write'] }), updateLeaveStatus);

module.exports = router;
