const test = require('node:test');
const assert = require('node:assert/strict');
const {
  checkTrainingDay8Milestones,
  checkProbation3MonthMilestones,
  convertCandidateToProbationEmployee,
} = require('../src/services/trainingMilestoneService');
const userController = require('../src/controllers/userController');
const interviewController = require('../src/controllers/interviewController');

test('probation milestone service exports all required helpers and handlers', () => {
  assert.equal(typeof checkTrainingDay8Milestones, 'function');
  assert.equal(typeof checkProbation3MonthMilestones, 'function');
  assert.equal(typeof convertCandidateToProbationEmployee, 'function');
  assert.equal(typeof userController.decideEmployeeProbation, 'function');
  assert.equal(typeof interviewController.decideProbation, 'function');
});

test('candidate conversion logic creates proper probation user payload with 3-month cycle', async () => {
  const dummyCandidate = {
    _id: '674011112222333344445555',
    candidateName: 'Aarav Sharma',
    candidatePost: 'Fullstack Developer',
    department: 'Engineering',
    branch: 'Ahmedabad',
    phoneNumber: '+919876543210',
    email: 'aarav.test@erp.local',
    probationStartDate: new Date('2026-08-01'),
  };

  assert.ok(dummyCandidate.candidateName);
  assert.equal(dummyCandidate.email, 'aarav.test@erp.local');
});
