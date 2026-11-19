const express = require('express');
const { getSalaryStructure, upsertSalaryStructure } = require('../controllers/salaryController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/:userId', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['payroll.read'] }), getSalaryStructure);
router.post('/', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['payroll.write'] }), upsertSalaryStructure);

module.exports = router;
