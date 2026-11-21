const express = require('express');
const router = express.Router();
const {
  getAllAttendance,
  getLiveAttendance,
  punchInOut,
  getUserAttendance,
  getMyAttendance,
  updateAttendanceRecord,
  manualUpdateAttendance,
  getShiftStatus,
  extendShift,
} = require('../controllers/attendanceController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

router.get('/shift-status', protect, getShiftStatus);
router.post('/extend-shift', protect, extendShift);
router.get('/me', protect, getMyAttendance);
router.get('/live', protect, authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['attendance.read'] }), getLiveAttendance);
router.get('/', protect, authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['attendance.read'] }), getAllAttendance);
router.get('/user/:userId', protect, authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['attendance.read'] }), getUserAttendance);
router.post('/manual-update', protect, authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['attendance.write'] }), manualUpdateAttendance);
router.patch('/:id', protect, authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['attendance.write'] }), updateAttendanceRecord);
router.post('/punch', protect, punchInOut);
router.post('/punch-in', protect, (req, res, next) => {
  req.body = { ...req.body, action: 'in' };
  return punchInOut(req, res, next);
});
router.post('/punch-out', protect, (req, res, next) => {
  req.body = { ...req.body, action: 'out' };
  return punchInOut(req, res, next);
});
router.post('/check-in', protect, (req, res, next) => {
  req.body = { ...req.body, action: 'in' };
  return punchInOut(req, res, next);
});

module.exports = router;
