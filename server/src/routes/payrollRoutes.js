const express = require('express');
const router = express.Router();
const {
  generatePayrollBatch,
  getAllPayroll,
  updatePayrollStatus,
  getMyPayroll,
} = require('../controllers/payrollController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/my', getMyPayroll);
router.get('/', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['payroll.read'] }), getAllPayroll);
router.post('/generate', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['payroll.create'] }), generatePayrollBatch);
router.put('/:id', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['payroll.write'] }), updatePayrollStatus);

module.exports = router;
