const mongoose = require('mongoose');
const BreakLog = require('../models/BreakLog');
const BreakRequest = require('../models/BreakRequest');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { logicalShiftWindow, startOfLogicalShiftDay } = require('../utils/date');
const { writeAuditLog } = require('../services/auditService');
const { dispatchNotifications } = require('../services/notificationService');

const startBreak = asyncHandler(async (req, res) => {
  const ongoing = await BreakLog.findOne({ user: req.user._id, status: 'Ongoing' });
  if (ongoing) throw new AppError('You already have an ongoing break', 409, 'BREAK_ALREADY_ACTIVE');

  const todayLogical = startOfLogicalShiftDay(new Date());
  const attendance = await Attendance.findOne({ user: req.user._id, date: todayLogical });
  if (attendance && attendance.logoutTime) {
    throw new AppError('Your shift has already ended for today', 400, 'SHIFT_ALREADY_COMPLETED');
  }
  if (!attendance?.loginTime && !['admin', 'super admin'].includes(req.user.role)) {
    throw new AppError('You must check in for your shift before taking a break', 400, 'NOT_CHECKED_IN');
  }

  if (req.body.password) {
    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.matchPassword(req.body.password))) {
      throw new AppError('Invalid password', 401, 'INVALID_CREDENTIALS');
    }
  }

  let breakType = validators.requiredString(req.body.breakType, 'breakType', { max: 120 });
  let allottedDuration = validators.number(req.body.allottedDuration, 'allottedDuration', { min: 1, max: 240 });
  let approvedRequest;

  if (req.body.requestId) {
    validators.objectId(req.body.requestId, 'requestId');
    approvedRequest = await BreakRequest.findOneAndUpdate(
      {
        _id: req.body.requestId,
        user: req.user._id,
        status: 'Approved',
        isUsed: false,
      },
      { $set: { isUsed: true } },
      { returnDocument: 'after' },
    );
    if (!approvedRequest) {
      throw new AppError('Approved break request is invalid, already used, or belongs to another user', 400, 'INVALID_BREAK_REQUEST');
    }
    breakType = 'Approved Custom Break';
    allottedDuration = approvedRequest.requestedDuration;
  }

  try {
    const breakLog = await BreakLog.create({
      user: req.user._id,
      breakType,
      allottedDuration,
      startTime: new Date(),
      sourceRequest: approvedRequest?._id,
    });
    await writeAuditLog(req, 'break.started', 'BreakLog', breakLog._id, { breakType, allottedDuration });
    await dispatchNotifications({ recipients: req.user._id, title: 'Break started', message: `${breakType} started for ${allottedDuration} minutes.`, type: 'info', link: '/take-break', createdBy: req.user._id, metadata: { breakId: breakLog._id, status: 'started' } });
    res.status(201).json(breakLog);
  } catch (error) {
    if (approvedRequest) await BreakRequest.findByIdAndUpdate(approvedRequest._id, { $set: { isUsed: false } });
    throw error;
  }
});

const endBreak = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'break id');
  const breakLog = await BreakLog.findById(req.params.id);
  if (!breakLog) throw new AppError('Break log not found', 404, 'BREAK_NOT_FOUND');

  const isOwner = breakLog.user.equals(req.user._id);
  const isAdmin = ['admin', 'super admin'].includes(req.user.role);
  if (!isOwner && !isAdmin) throw new AppError('You cannot end another employee’s break', 403, 'FORBIDDEN');
  if (breakLog.status === 'Completed') return res.json(breakLog);

  if (req.body.password) {
    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.matchPassword(req.body.password))) {
      throw new AppError('Invalid password', 401, 'INVALID_CREDENTIALS');
    }
  }

  const endTime = new Date();
  const actualDuration = Math.max(0, Math.ceil((endTime - breakLog.startTime) / 60000));
  breakLog.endTime = endTime;
  breakLog.actualDuration = actualDuration;
  breakLog.status = 'Completed';
  breakLog.isExceeded = actualDuration > breakLog.allottedDuration;
  breakLog.exceededDuration = Math.max(0, actualDuration - breakLog.allottedDuration);
  await breakLog.save();

  await writeAuditLog(req, 'break.ended', 'BreakLog', breakLog._id, {
    actualDuration,
    exceededDuration: breakLog.exceededDuration,
  });
  await dispatchNotifications({ recipients: breakLog.user, title: breakLog.isExceeded ? 'Break limit exceeded' : 'Break ended', message: `Break ended after ${actualDuration} minutes.`, type: breakLog.isExceeded ? 'warning' : 'success', link: '/take-break', createdBy: req.user._id, metadata: { breakId: breakLog._id, status: 'ended' } });
  res.json(breakLog);
});

const getMyBreaks = asyncHandler(async (req, res) => {
  const window = logicalShiftWindow(req.query.date ? `${req.query.date}T12:00:00` : new Date());
  if (!window) throw new AppError('Invalid date', 400, 'INVALID_DATE');

  const breaks = await BreakLog.find({
    user: req.user._id,
    startTime: { $gte: window.start, $lte: window.end },
  }).sort({ startTime: -1 }).lean();
  res.json(breaks);
});

const getUserBreaks = asyncHandler(async (req, res) => {
  let targetUserId = req.params.userId;
  if (!mongoose.isValidObjectId(targetUserId)) {
    const user = await User.findOne({ employeeId: targetUserId, deletedAt: null }).select('_id');
    if (user) {
      targetUserId = user._id;
    } else {
      return res.json([]);
    }
  }
  const query = { user: targetUserId };
  if (req.query.from || req.query.to) {
    query.startTime = {};
    if (req.query.from) query.startTime.$gte = new Date(req.query.from);
    if (req.query.to) query.startTime.$lte = new Date(req.query.to);
  }
  const breaks = await BreakLog.find(query).sort({ startTime: -1 }).limit(1000).lean();
  res.json(breaks);
});

module.exports = { startBreak, endBreak, getMyBreaks, getUserBreaks };
