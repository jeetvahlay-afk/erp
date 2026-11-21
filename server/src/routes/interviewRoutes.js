const express = require('express');
const router = express.Router();
const { getInterviews, getInterviewById, createInterview, updateInterview, deleteInterview, decideProbation } = require('../controllers/interviewController');
const { protect, authorizeAccess } = require('../middleware/authMiddleware');

const roles = ['admin', 'super admin', 'recruiter', 'hr'];
router.use(protect);
router.get('/', authorizeAccess({ roles, permissions: ['recruitment.read'] }), getInterviews);
router.get('/:id', authorizeAccess({ roles, permissions: ['recruitment.read'] }), getInterviewById);
router.post('/', authorizeAccess({ roles, permissions: ['recruitment.create'] }), createInterview);
router.post('/:id/probation-decision', authorizeAccess({ roles, permissions: ['recruitment.write'] }), decideProbation);
router.put('/:id', authorizeAccess({ roles, permissions: ['recruitment.write'] }), updateInterview);
router.delete('/:id', authorizeAccess({ roles, permissions: ['recruitment.delete'] }), deleteInterview);

module.exports = router;
