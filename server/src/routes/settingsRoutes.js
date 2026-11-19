const express = require('express');
const { getSettings, getAllSettings, updateSettings, testMailSettings } = require('../controllers/settingsController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

const router = express.Router();
const readSettings = authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['settings.read'] });
const writeSettings = authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['settings.write'] });

router.use(protect);
router.get('/', readSettings, getAllSettings);
router.post('/mail/test', writeSettings, testMailSettings);
router.get('/:type', readSettings, getSettings);
router.post('/:type', writeSettings, updateSettings);

module.exports = router;
