const express = require('express');
const router = express.Router();
const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/roleController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

router.get('/', protect, authorizeAccess({ roles: ['admin', 'super admin', 'hr'], permissions: ['roles.read'] }), getRoles);
router.post('/', protect, authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['roles.create'] }), createRole);
router.put('/:id', protect, authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['roles.write'] }), updateRole);
router.delete('/:id', protect, authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['roles.delete'] }), deleteRole);

module.exports = router;
