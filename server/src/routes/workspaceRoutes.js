const express = require('express');
const { getContent, createContent, getBirthdays, getDocuments, getDirectory } = require('../controllers/workspaceController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/birthdays', getBirthdays);
router.get('/documents', getDocuments);
router.get('/directory', getDirectory);
router.get('/:kind', getContent);
router.post('/:kind', authorizeAccess({ roles: ['admin', 'super admin'], permissions: ['settings.write'] }), createContent);

module.exports = router;
