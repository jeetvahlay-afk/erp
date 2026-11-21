const test = require('node:test');
const assert = require('node:assert/strict');
const assessmentData = require('../src/data/assessmentQuestions.json');
const assessmentController = require('../src/controllers/assessmentController');

test('assessment JSON contains all 10 roles with totalQuestions 30 and timeMinutes 50', () => {
  const keys = Object.keys(assessmentData.assessments);
  assert.equal(keys.length, 10, 'Must have 10 assessment sets');

  for (const key of keys) {
    const asm = assessmentData.assessments[key];
    assert.ok(asm.assessmentTitle, `${key} has a title`);
    assert.equal(asm.totalQuestions, 30, `${key} totalQuestions is 30 in JSON`);
    assert.equal(asm.timeMinutes, 50, `${key} has 50 minutes duration in JSON`);
    assert.ok(Array.isArray(asm.sections), `${key} has sections`);
    assert.ok(asm.sections.length > 0, `${key} has at least 1 section`);
    assert.ok(asm.sections[0].questions.length > 0, `${key} has questions in section`);
  }
});

test('assessmentController exports all required public endpoint handlers', () => {
  assert.equal(typeof assessmentController.getMetadata, 'function');
  assert.equal(typeof assessmentController.registerCandidate, 'function');
  assert.equal(typeof assessmentController.verifyEmail, 'function');
  assert.equal(typeof assessmentController.resendVerificationOtp, 'function');
  assert.equal(typeof assessmentController.loginCandidate, 'function');
  assert.equal(typeof assessmentController.getAssessmentIntro, 'function');
  assert.equal(typeof assessmentController.startOrGetExam, 'function');
  assert.equal(typeof assessmentController.saveAnswer, 'function');
  assert.equal(typeof assessmentController.recordTabSwitch, 'function');
  assert.equal(typeof assessmentController.submitAssessment, 'function');
  assert.equal(typeof assessmentController.getAssessmentResult, 'function');
});

test('assessment JSON defines position details and valid role mapping', () => {
  const step2 = assessmentData.assessmentForm.step2_positionDetails;
  assert.ok(step2, 'Must have step2_positionDetails');
  assert.ok(step2.positionToAssessmentKey, 'Must have positionToAssessmentKey');

  const posField = step2.fields.find((f) => f.fieldName === 'positionAppliedFor');
  assert.ok(posField, 'Must have positionAppliedFor field');
  assert.ok(Array.isArray(posField.options), 'Options must be an array');
  assert.ok(posField.options.length >= 10, 'Must have at least 10 role options');

  for (const opt of posField.options) {
    const mappedKey = step2.positionToAssessmentKey[opt.value];
    assert.ok(mappedKey, `Position ${opt.value} must map to an assessment key`);
    assert.ok(assessmentData.assessments[mappedKey], `Assessment key ${mappedKey} must exist in assessments`);
  }
});
