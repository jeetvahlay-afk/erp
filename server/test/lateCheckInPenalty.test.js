const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Attendance = require('../src/models/Attendance');

test('Attendance model: 3rd late penalty cuts 4.5 hours and sets status to Half Day', async () => {
  const loginTime = new Date('2026-11-21T09:30:00Z');
  const logoutTime = new Date('2026-11-21T18:30:00Z'); // 9 hours gross

  const attendance = new Attendance({
    user: new mongoose.Types.ObjectId(),
    date: new Date('2026-11-21T00:00:00Z'),
    loginTime,
    logoutTime,
    isLateCheckIn: true,
    lateMinutes: 15,
    isLatePenalty: true,
    penaltyDeductionHours: 4.5,
  });

  await attendance.validate();

  assert.equal(attendance.grossHours, 9);
  assert.equal(attendance.totalHours, 4.5); // 9 - 4.5
  assert.equal(attendance.status, 'Half Day');
});

test('Attendance model: standard late check-in without 3rd-late penalty keeps status Late and full hours', async () => {
  const loginTime = new Date('2026-11-21T09:30:00Z');
  const logoutTime = new Date('2026-11-21T18:30:00Z'); // 9 hours gross

  const attendance = new Attendance({
    user: new mongoose.Types.ObjectId(),
    date: new Date('2026-11-21T00:00:00Z'),
    loginTime,
    logoutTime,
    isLateCheckIn: true,
    lateMinutes: 15,
    isLatePenalty: false,
    penaltyDeductionHours: 0,
  });

  await attendance.validate();

  assert.equal(attendance.grossHours, 9);
  assert.equal(attendance.totalHours, 9);
  assert.equal(attendance.status, 'Late');
});
