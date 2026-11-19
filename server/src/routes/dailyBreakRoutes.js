const express = require('express');
const { getDailyBreaks, setDailyBreaks, resetDailyBreaks } = require('../controllers/dailyBreakController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', getDailyBreaks);
router.post('/', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['settings.write'] }), setDailyBreaks);
router.delete('/', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['settings.write'] }), resetDailyBreaks);

module.exports = router;
