const express = require('express');
const {
  getDepartments, getDepartmentById, createDepartment, updateDepartment,
  toggleDepartment, deleteDepartment,
} = require('../controllers/departmentController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', getDepartments);
router.get('/:id', getDepartmentById);
router.post('/', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['departments.create'] }), createDepartment);
router.put('/:id', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['departments.write'] }), updateDepartment);
router.patch('/:id/toggle', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['departments.write'] }), toggleDepartment);
router.delete('/:id', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['departments.delete'] }), deleteDepartment);

module.exports = router;
