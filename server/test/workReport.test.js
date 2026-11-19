const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const WorkReport = require('../src/models/WorkReport');

test('work report requires bounded hours and progress', async () => {
  const report = new WorkReport({ user: new mongoose.Types.ObjectId(), date: new Date(), hoursWorked: 25, completion: 101, accomplishments: 'Done' });
  const errors = await report.validate().then(() => ({}), (error) => error.errors);
  assert.ok(errors.hoursWorked);
  assert.ok(errors.completion);
});
