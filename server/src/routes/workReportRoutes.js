const express = require('express');
const { listMine, saveMine, listAll } = require('../controllers/workReportController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/me', listMine);
router.put('/me', saveMine);
router.get('/', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['employees.read'] }), listAll);
module.exports = router;
