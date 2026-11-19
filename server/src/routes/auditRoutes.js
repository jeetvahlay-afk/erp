const express = require('express');
const { getAuditLogs } = require('../controllers/auditController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/', protect, authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['audit.read'] }), getAuditLogs);
module.exports = router;
