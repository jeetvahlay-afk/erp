const express = require('express');
const { startBreak, endBreak, getMyBreaks, getUserBreaks } = require('../controllers/breakLogController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/my-breaks', getMyBreaks);
router.get('/user/:userId', authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['attendance.read'] }), getUserBreaks);
router.post('/start', startBreak);
router.put('/end/:id', endBreak);

module.exports = router;
