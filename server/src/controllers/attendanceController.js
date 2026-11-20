const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const BreakLog = require('../models/BreakLog');
const User = require('../models/User');
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { startOfLogicalShiftDay, logicalShiftWindow, getISTComponents, createFromIST } = require('../utils/date');
const { writeAuditLog } = require('../services/auditService');
const { dispatchNotifications } = require('../services/notificationService');

const resolveShiftDetails = async (user, date = new Date()) => {
  let shift = null;
  if (user?.shift) {
    const shiftSettings = await Settings.findOne({ type: 'shifts' }).lean();
    const shifts = shiftSettings?.config || [];
    shift = shifts.find((s) => s.id === user.shift);
  }

  const isNight = Boolean(
    shift?.isNightShift ||
    (shift?.startTime && shift?.endTime && shift.endTime <= shift.startTime)
  );

  const istNow = getISTComponents(date);
  let logicalDate;

  if (isNight && shift?.startTime && shift?.endTime) {
    const [sh] = shift.startTime.split(':').map(Number);
    const [eh] = shift.endTime.split(':').map(Number);
    // For night shifts spanning midnight:
    // If current time is early morning before shift end + 4 hours (e.g. 00:00 to 10:00 AM),
    // the shift belongs to the previous day when it started.
    const morningCutoff = Math.min(13, eh + 4);
    if (istNow.hours < morningCutoff) {
      const yesterday = createFromIST(istNow.year, istNow.month, istNow.date - 1);
      const istYesterday = getISTComponents(yesterday);
      logicalDate = createFromIST(istYesterday.year, istYesterday.month, istYesterday.date, 0, 0, 0, 0);
    } else {
      logicalDate = createFromIST(istNow.year, istNow.month, istNow.date, 0, 0, 0, 0);
    }
  } else {
    logicalDate = startOfLogicalShiftDay(date);
  }

  const istLogical = getISTComponents(logicalDate);
  let shiftStart = null;
  let shiftEnd = null;

  if (shift && shift.startTime && shift.endTime) {
    const [sh, sm] = shift.startTime.split(':').map(Number);
    const [eh, em] = shift.endTime.split(':').map(Number);
    shiftStart = createFromIST(istLogical.year, istLogical.month, istLogical.date, sh, sm, 0, 0);
    shiftEnd = createFromIST(istLogical.year, istLogical.month, istLogical.date, eh, em, 0, 0);
    if (isNight) {
      shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  return {
    shift,
    isNight,
    logicalDate,
    shiftStart,
    shiftEnd,
  };
};

const autoResolveMissingPunches = async (req) => {
  try {
    const now = new Date();
    const todayLogical = startOfLogicalShiftDay(now);
    if (!todayLogical) return;

    // Find all attendance records with loginTime but no logoutTime
    const openRecords = await Attendance.find({
      logoutTime: null,
      loginTime: { $ne: null },
    }).populate('user');

    if (!openRecords.length) return;

    const shiftSettings = await Settings.findOne({ type: 'shifts' }).lean();
    const shifts = shiftSettings?.config || [];
    const shiftsMap = new Map(shifts.map((s) => [s.id, s]));

    for (const record of openRecords) {
      const isPastDay = record.date < todayLogical;
      const userShiftId = record.user?.shift;
      const shift = userShiftId ? shiftsMap.get(userShiftId) : null;
      const isNight = Boolean(shift?.isNightShift || (shift?.startTime && shift?.endTime && shift.endTime <= shift.startTime));

      let scheduledEnd = null;
      if (shift && shift.endTime) {
        const [eh, em] = shift.endTime.split(':').map(Number);
        const istLogical = getISTComponents(record.date);
        scheduledEnd = createFromIST(istLogical.year, istLogical.month, istLogical.date, eh, em, 0, 0);
        if (isNight) {
          scheduledEnd = new Date(scheduledEnd.getTime() + 24 * 60 * 60 * 1000);
        }
      } else if (record.loginTime) {
        scheduledEnd = new Date(record.loginTime.getTime() + 9 * 60 * 60 * 1000);
      }

      const effectiveEnd = record.extendedUntil || scheduledEnd;
      // Auto-checkout threshold is 25 minutes after effective shift end (15 min prompt + 10 min timeout)
      const autoCheckoutThreshold = effectiveEnd ? new Date(effectiveEnd.getTime() + 25 * 60 * 1000) : null;

      // Auto-checkout if previous day, or if past today's auto-checkout threshold
      if (isPastDay || (autoCheckoutThreshold && now >= autoCheckoutThreshold)) {
        record.logoutTime = now;
        record.autoPunchedOut = true;
        await record.save();

        await writeAuditLog(req, 'attendance.auto_punch_out', 'Attendance', record._id, {
          totalHours: record.totalHours,
          userId: record.user?._id,
          userEmail: record.user?.email,
          reason: isPastDay ? 'missing_previous_day_punch' : 'overtime_unanswered_timeout',
        });
      }
    }
  } catch (error) {
    console.error('Failed to auto-resolve missing punches:', error);
  }
};

const populateActiveHours = async (records) => {
  if (!records || !records.length) return records;

  const todayLogical = startOfLogicalShiftDay(new Date()).getTime();
  const activeRecords = records.filter(r => r.loginTime && !r.logoutTime && r.date && new Date(r.date).getTime() === todayLogical);
  if (!activeRecords.length) return records;

  const userIds = activeRecords.map(r => r.user?._id || r.user);
  const { start, end } = logicalShiftWindow(new Date());

  const breaks = await BreakLog.find({
    user: { $in: userIds },
    startTime: { $gte: start, $lte: end }
  }).lean();

  const breaksByUser = breaks.reduce((map, item) => {
    const key = String(item.user);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());

  const now = new Date();
  activeRecords.forEach((record) => {
    const userBreaks = breaksByUser.get(String(record.user?._id || record.user)) || [];
    const grossMs = Math.max(0, now - new Date(record.loginTime));
    const breakMs = userBreaks.reduce((total, item) => total + Math.max(0, (item.endTime ? new Date(item.endTime) : now) - new Date(item.startTime)), 0);
    record.totalHours = Math.max(0, grossMs - breakMs) / 3600000;
  });

  return records;
};

const getMyAttendance = asyncHandler(async (req, res) => {
  await autoResolveMissingPunches(req);
  const query = { user: req.user._id };
  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) query.date.$gte = new Date(req.query.from);
    if (req.query.to) query.date.$lte = new Date(req.query.to);
  }
  if (req.query.status) query.status = validators.enumValue(req.query.status, ['Present', 'Absent', 'Late', 'Half Day'], 'status');
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const [items, total] = await Promise.all([
    Attendance.find(query).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Attendance.countDocuments(query),
  ]);
  const populatedItems = await populateActiveHours(items);
  res.json({ items: populatedItems, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const getAllAttendance = asyncHandler(async (req, res) => {
  await autoResolveMissingPunches(req);
  const query = {};
  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) query.date.$gte = new Date(req.query.from);
    if (req.query.to) query.date.$lte = new Date(req.query.to);
  }
  if (req.query.userId) {
    validators.objectId(req.query.userId, 'userId');
    query.user = req.query.userId;
  }
  const records = await Attendance.find(query)
    .populate('user', 'name email employeeId role department')
    .sort({ date: -1, loginTime: -1 })
    .lean();
  const populatedRecords = await populateActiveHours(records);
  res.json(populatedRecords);
});

const getLiveAttendance = asyncHandler(async (req, res) => {
  await autoResolveMissingPunches(req);
  const now = new Date();
  const logicalDate = startOfLogicalShiftDay(now);
  const window = logicalShiftWindow(now);
  const [employees, attendance, breaks] = await Promise.all([
    User.find({ deletedAt: null, isActive: true }).select('name email employeeId department designation profileImage shift').sort({ name: 1 }).lean(),
    Attendance.find({ date: logicalDate }).lean(),
    BreakLog.find({ startTime: { $gte: window.start, $lte: window.end } }).sort({ startTime: 1 }).lean(),
  ]);
  const attendanceByUser = new Map(attendance.map((record) => [String(record.user), record]));
  const breaksByUser = breaks.reduce((map, item) => { const key = String(item.user); if (!map.has(key)) map.set(key, []); map.get(key).push(item); return map; }, new Map());
  const rows = employees.map((employee) => {
    const record = attendanceByUser.get(String(employee._id));
    const userBreaks = breaksByUser.get(String(employee._id)) || [];
    const activeBreak = userBreaks.find((item) => item.status === 'Ongoing') || null;
    const grossMilliseconds = record?.loginTime ? Math.max(0, (record.logoutTime ? new Date(record.logoutTime) : now) - new Date(record.loginTime)) : 0;
    const breakMilliseconds = userBreaks.reduce((total, item) => total + Math.max(0, (item.endTime ? new Date(item.endTime) : now) - new Date(item.startTime)), 0);
    const workingMilliseconds = Math.max(0, grossMilliseconds - breakMilliseconds);
    const workState = activeBreak ? 'On Break' : record?.loginTime && !record.logoutTime ? 'Working' : record?.logoutTime ? 'Punched Out' : 'Not Punched In';
    return { employee, attendance: record || null, activeBreak, breakCount: userBreaks.length, breakMilliseconds, workingMilliseconds, grossMilliseconds, workState };
  });
  res.json({ generatedAt: now, rows });
});

const punchInOut = asyncHandler(async (req, res) => {
  await autoResolveMissingPunches(req);
  const action = req.body.action || 'auto';
  validators.enumValue(action, ['in', 'out', 'auto'], 'action');
  const shiftDetails = await resolveShiftDetails(req.user);
  const logicalDate = shiftDetails.logicalDate;
  let record = await Attendance.findOne({ user: req.user._id, date: logicalDate });

  const resolvedAction = action === 'auto' ? (!record?.loginTime ? 'in' : (!record.logoutTime ? 'out' : 'out')) : action;

  if (resolvedAction === 'in') {
    if (record?.logoutTime) {
      throw new AppError('Shift has already ended for today. You cannot punch in again for this shift.', 400, 'SHIFT_ALREADY_COMPLETED');
    }
    if (record?.loginTime) {
      record = await record.populate('user', 'name email employeeId role');
      return res.json({ message: 'Already punched in for this shift', record });
    }

    const now = new Date();
    let status = 'Present';

    if (shiftDetails.shiftStart) {
      // Late if login is more than 15 minutes after shift start
      const lateThreshold = new Date(shiftDetails.shiftStart.getTime() + 15 * 60 * 1000);
      if (now > lateThreshold) {
        status = 'Late';
      }
    }

    try {
      record = await Attendance.findOneAndUpdate(
        { user: req.user._id, date: logicalDate },
        { $setOnInsert: { loginTime: now, status } },
        { returnDocument: 'after', upsert: true, runValidators: true },
      );
    } catch (error) {
      if (error.code === 11000) record = await Attendance.findOne({ user: req.user._id, date: logicalDate });
      else throw error;
    }
    await writeAuditLog(req, 'attendance.punch_in', 'Attendance', record._id);
  } else {
    if (!record?.loginTime) throw new AppError('You must punch in before punching out', 409, 'NOT_PUNCHED_IN');
    if (record.logoutTime) return res.json({ message: 'Already punched out for this shift', record });
    const ongoingBreak = await BreakLog.findOne({ user: req.user._id, status: 'Ongoing' });
    if (ongoingBreak) {
      throw new AppError('You cannot check out while on a break. Please end your break (break out) first.', 400, 'ACTIVE_BREAK_EXISTS');
    }
    record.logoutTime = new Date();
    await record.save();
    await writeAuditLog(req, 'attendance.punch_out', 'Attendance', record._id, { totalHours: record.totalHours });
  }

  record = await record.populate('user', 'name email employeeId role');
  const recordObj = record.toObject();
  const populated = await populateActiveHours([recordObj]);
  await dispatchNotifications({
    recipients: req.user._id,
    title: resolvedAction === 'in' ? 'Attendance: punched in' : 'Attendance: punched out',
    message: `${req.user.name}, your ${resolvedAction === 'in' ? 'arrival' : 'departure'} was recorded successfully.`,
    type: 'success',
    link: '/attendance',
    createdBy: req.user._id,
    metadata: { attendanceId: record._id, action: resolvedAction },
  });
  return res.json({ message: resolvedAction === 'in' ? 'Punch in recorded' : 'Punch out recorded', record: populated[0] });
});

const getShiftStatus = asyncHandler(async (req, res) => {
  const shiftDetails = await resolveShiftDetails(req.user);
  let record = await Attendance.findOne({ user: req.user._id, date: shiftDetails.logicalDate });

  const now = new Date();
  const loginTime = record?.loginTime || null;
  const logoutTime = record?.logoutTime || null;
  const isPunchedIn = Boolean(loginTime && !logoutTime);
  const isShiftCompleted = Boolean(loginTime && logoutTime);

  let scheduledEndTime = shiftDetails.shiftEnd;
  if (!scheduledEndTime && loginTime) {
    scheduledEndTime = new Date(loginTime.getTime() + 9 * 60 * 60 * 1000);
  } else if (!scheduledEndTime) {
    const istLogical = getISTComponents(shiftDetails.logicalDate);
    scheduledEndTime = createFromIST(istLogical.year, istLogical.month, istLogical.date, 18, 0, 0, 0);
  }

  const effectiveEnd = record?.extendedUntil || scheduledEndTime;
  const promptTime = new Date(effectiveEnd.getTime() + 15 * 60 * 1000); // 15 min after shift end
  const autoCheckoutTime = new Date(promptTime.getTime() + 10 * 60 * 1000); // 10 min after prompt (25 min total)

  if (isPunchedIn && now >= autoCheckoutTime) {
    record.logoutTime = now;
    record.autoPunchedOut = true;
    await record.save();

    await writeAuditLog(req, 'attendance.auto_punch_out', 'Attendance', record._id, {
      reason: 'overtime_unanswered_timeout',
      totalHours: record.totalHours,
    });

    await dispatchNotifications({
      recipients: req.user._id,
      title: 'Attendance: Automatically Checked Out',
      message: 'Your shift was automatically ended because no response was received within 10 minutes of shift end.',
      type: 'warning',
      link: '/attendance',
      createdBy: req.user._id,
    });

    return res.json({
      hasRecord: true,
      isPunchedIn: false,
      isShiftCompleted: true,
      loginTime: record.loginTime,
      logoutTime: record.logoutTime,
      scheduledStartTime: shiftDetails.shiftStart,
      scheduledEndTime: effectiveEnd,
      baseShiftEndTime: scheduledEndTime,
      extendedUntil: record.extendedUntil || null,
      overtimeExtensions: record.overtimeExtensions || 0,
      autoPunchedOut: true,
      promptTime,
      autoCheckoutTime,
      shouldPrompt: false,
      secondsRemaining: 0,
      shiftName: shiftDetails.shift?.shiftName || 'Standard Shift',
      isNightShift: shiftDetails.isNight,
    });
  }

  const shouldPrompt = Boolean(isPunchedIn && now >= promptTime && now < autoCheckoutTime);
  const secondsRemaining = shouldPrompt ? Math.max(0, Math.floor((autoCheckoutTime.getTime() - now.getTime()) / 1000)) : 0;

  return res.json({
    hasRecord: Boolean(record),
    isPunchedIn,
    isShiftCompleted,
    loginTime,
    logoutTime,
    scheduledStartTime: shiftDetails.shiftStart,
    scheduledEndTime: effectiveEnd,
    baseShiftEndTime: scheduledEndTime,
    extendedUntil: record?.extendedUntil || null,
    overtimeExtensions: record?.overtimeExtensions || 0,
    autoPunchedOut: Boolean(record?.autoPunchedOut),
    promptTime,
    autoCheckoutTime,
    shouldPrompt,
    secondsRemaining,
    shiftName: shiftDetails.shift?.shiftName || 'Standard Shift',
    isNightShift: shiftDetails.isNight,
  });
});

const extendShift = asyncHandler(async (req, res) => {
  const shiftDetails = await resolveShiftDetails(req.user);
  const record = await Attendance.findOne({ user: req.user._id, date: shiftDetails.logicalDate });
  if (!record || !record.loginTime || record.logoutTime) {
    throw new AppError('No active shift to extend', 400, 'NO_ACTIVE_SHIFT');
  }

  const base = record.extendedUntil || shiftDetails.shiftEnd || new Date(record.loginTime.getTime() + 9 * 60 * 60 * 1000);
  record.extendedUntil = new Date(base.getTime() + 60 * 60 * 1000);
  record.overtimeExtensions = (record.overtimeExtensions || 0) + 1;
  await record.save();

  await writeAuditLog(req, 'attendance.extend_shift', 'Attendance', record._id, {
    extendedUntil: record.extendedUntil,
    extensionsCount: record.overtimeExtensions,
  });

  await dispatchNotifications({
    recipients: req.user._id,
    title: 'Shift Extended',
    message: `Your shift has been extended by 1 hour (until ${new Date(record.extendedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
    type: 'info',
    link: '/attendance',
    createdBy: req.user._id,
  });

  return res.json({
    message: 'Shift extended by 1 hour',
    extendedUntil: record.extendedUntil,
    overtimeExtensions: record.overtimeExtensions,
  });
});

const updateAttendanceRecord = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'attendance id');
  const record = await Attendance.findById(req.params.id);
  if (!record) throw new AppError('Attendance record not found', 404, 'ATTENDANCE_NOT_FOUND');
  if (req.body.status !== undefined) record.status = validators.enumValue(req.body.status, ['Present', 'Absent', 'Late', 'Half Day'], 'status');
  if (req.body.loginTime !== undefined) {
    const loginTime = req.body.loginTime ? new Date(req.body.loginTime) : null;
    validators.ensure(!loginTime || !Number.isNaN(loginTime.getTime()), 'Valid loginTime is required', 'loginTime');
    record.loginTime = loginTime;
  }
  if (req.body.logoutTime !== undefined) {
    const logoutTime = req.body.logoutTime ? new Date(req.body.logoutTime) : null;
    validators.ensure(!logoutTime || !Number.isNaN(logoutTime.getTime()), 'Valid logoutTime is required', 'logoutTime');
    record.logoutTime = logoutTime;
  }
  if (record.loginTime && record.logoutTime && record.logoutTime < record.loginTime) throw new AppError('Logout time must be after login time', 400, 'INVALID_TIME_RANGE');
  await record.save();
  await writeAuditLog(req, 'attendance.updated', 'Attendance', record._id, { status: record.status });
  const recordObj = record.toObject();
  const populated = await populateActiveHours([recordObj]);
  res.json(populated[0]);
});

const getUserAttendance = asyncHandler(async (req, res) => {
  let targetUserId = req.params.userId;
  if (!mongoose.isValidObjectId(targetUserId)) {
    const user = await User.findOne({ employeeId: targetUserId, deletedAt: null }).select('_id');
    if (user) {
      targetUserId = user._id;
    } else {
      return res.json([]);
    }
  }
  const records = await Attendance.find({ user: targetUserId }).sort({ date: -1 }).lean();
  const populatedRecords = await populateActiveHours(records);
  res.json(populatedRecords);
});

module.exports = {
  getAllAttendance,
  getLiveAttendance,
  punchInOut,
  getUserAttendance,
  getMyAttendance,
  updateAttendanceRecord,
  autoResolveMissingPunches,
  getShiftStatus,
  extendShift,
};
