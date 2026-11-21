const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Attendance = require('../src/models/Attendance');

test('Attendance model: respects manual status override without recalculation overwriting it', async () => {
  const dummyUser = new mongoose.Types.ObjectId();
  const today = new Date('2026-11-22T00:00:00.000Z');

  // Admin marks employee as Present manually, even if total hours would otherwise be below 7
  const attendance = new Attendance({
    user: dummyUser,
    date: today,
    loginTime: new Date('2026-11-22T10:00:00.000Z'),
    logoutTime: new Date('2026-11-22T14:00:00.000Z'), // only 4 hours
    status: 'Present',
    isManualOverride: true,
    manualOverrideReason: 'Special approval by HR',
  });

  await attendance.validate();

  assert.equal(attendance.status, 'Present');
  assert.equal(attendance.isManualOverride, true);
  assert.equal(attendance.manualOverrideReason, 'Special approval by HR');
});
