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
  const shiftSettings = await Settings.findOne({ type: 'shifts' }).lean();
  const shifts = shiftSettings?.config || [];
  if (user?.shift) {
    shift = shifts.find((s) => s.id === user.shift || s._id === user.shift);
  }
  if (!shift && shifts.length > 0) {
    shift = shifts[0];
  }
  if (!shift) {
    shift = {
      id: 'default-day',
      shiftName: 'Day Shift',
      startTime: '09:30',
      endTime: '18:30',
      gracePeriod: 15,
    };
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
    const grossWorkingHours = Math.max(0, grossMs - breakMs) / 3600000;
    record.grossHours = grossWorkingHours;
    const penalty = record.isLatePenalty ? (record.penaltyDeductionHours || 4.5) : 0;
    record.totalHours = Math.max(0, grossWorkingHours - penalty);
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
  const lateReason = req.body.lateReason ? String(req.body.lateReason).trim() : '';
  validators.enumValue(action, ['in', 'out', 'auto'], 'action');
  const shiftDetails = await resolveShiftDetails(req.user);
  const logicalDate = shiftDetails.logicalDate;
  let record = await Attendance.findOne({ user: req.user._id, date: logicalDate });

  const resolvedAction = action === 'auto' ? (!record?.loginTime ? 'in' : (!record.logoutTime ? 'out' : 'out')) : action;

  let isLateCheckIn = false;
  let lateMinutes = 0;
  let isLatePenalty = false;
  let penaltyDeductionHours = 0;
  let lateCountInMonth = 0;

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
      // Late if login is after shift start + configured grace period (defaults to 15 mins)
      const graceMinutes = Number(shiftDetails.shift?.gracePeriod ?? 15);
      const lateThreshold = new Date(shiftDetails.shiftStart.getTime() + graceMinutes * 60 * 1000);
      if (now > lateThreshold) {
        status = 'Late';
        isLateCheckIn = true;
        lateMinutes = Math.max(0, Math.round((now.getTime() - shiftDetails.shiftStart.getTime()) / 60000));
      }
    }

    if (isLateCheckIn) {
      if (!lateReason || lateReason.length < 5) {
        throw new AppError('A valid explanation is required for late check-in. Please submit your reason.', 400, 'LATE_REASON_REQUIRED');
      }

      const istLogical = getISTComponents(logicalDate);
      const startOfMonth = createFromIST(istLogical.year, istLogical.month, 1, 0, 0, 0, 0);

      // Count previous late check-ins for this user in the current calendar month
      const previousLates = await Attendance.countDocuments({
        user: req.user._id,
        date: { $gte: startOfMonth, $lt: logicalDate },
        $or: [
          { isLateCheckIn: true },
          { status: 'Late' },
          { isLatePenalty: true },
        ],
      });

      lateCountInMonth = previousLates + 1;

      // Every 3 late check-ins -> Cut half day (4.5 hours from working hours)
      if (lateCountInMonth % 3 === 0) {
        isLatePenalty = true;
        penaltyDeductionHours = 4.5;
        status = 'Half Day';
      }
    }

    try {
      record = await Attendance.findOneAndUpdate(
        { user: req.user._id, date: logicalDate },
        {
          $setOnInsert: {
            loginTime: now,
            status,
            isLateCheckIn,
            lateMinutes,
            isLatePenalty,
            penaltyDeductionHours,
            lateCountInMonth,
            lateReason: isLateCheckIn ? lateReason : undefined,
            lateReasonSubmittedAt: isLateCheckIn ? now : undefined,
          },
        },
        { returnDocument: 'after', upsert: true, runValidators: true },
      );
    } catch (error) {
      if (error.code === 11000) record = await Attendance.findOne({ user: req.user._id, date: logicalDate });
      else throw error;
    }
    await writeAuditLog(req, 'attendance.punch_in', 'Attendance', record._id, {
      isLateCheckIn,
      isLatePenalty,
      lateMinutes,
      penaltyDeductionHours,
      lateCountInMonth,
      lateReason: record.lateReason || undefined,
      status: record.status,
    });
  } else {
    if (!record?.loginTime) throw new AppError('You must punch in before punching out', 409, 'NOT_PUNCHED_IN');
    if (record.logoutTime) return res.json({ message: 'Already punched out for this shift', record });
    const ongoingBreak = await BreakLog.findOne({ user: req.user._id, status: 'Ongoing' });
    if (ongoingBreak) {
      throw new AppError('You cannot check out while on a break. Please end your break (break out) first.', 400, 'ACTIVE_BREAK_EXISTS');
    }
    record.logoutTime = new Date();

    const { start, end } = logicalShiftWindow(record.logoutTime);
    const userBreaks = await BreakLog.find({
      user: req.user._id,
      startTime: { $gte: start, $lte: end },
    }).lean();
    const breakMs = userBreaks.reduce((total, item) => total + Math.max(0, (item.endTime ? new Date(item.endTime).getTime() : record.logoutTime.getTime()) - new Date(item.startTime).getTime()), 0);
    const grossMs = Math.max(0, record.logoutTime.getTime() - record.loginTime.getTime());
    const netWorkingMs = Math.max(0, grossMs - breakMs);
    const grossHours = netWorkingMs / 3600000;
    record.grossHours = grossHours;

    const penalty = record.isLatePenalty ? (record.penaltyDeductionHours || 4.5) : 0;
    const netHours = Math.max(0, grossHours - penalty);
    record.totalHours = netHours;

    if (record.isLatePenalty) {
      record.status = 'Half Day';
    } else if (netHours < 7) {
      record.status = 'Half Day';
    } else if (record.isLateCheckIn) {
      record.status = 'Late';
    } else {
      record.status = 'Present';
    }
    await record.save();
    await writeAuditLog(req, 'attendance.punch_out', 'Attendance', record._id, {
      totalHours: record.totalHours,
      grossHours: record.grossHours,
      isLatePenalty: record.isLatePenalty,
      status: record.status,
    });
  }

  record = await record.populate('user', 'name email employeeId role');
  const recordObj = record.toObject();
  const populated = await populateActiveHours([recordObj]);

  let notificationTitle = resolvedAction === 'in' ? 'Attendance: Punched In' : 'Attendance: Punched Out';
  let notificationMessage = `${req.user.name}, your ${resolvedAction === 'in' ? 'arrival' : 'departure'} was recorded successfully.`;
  let notificationType = 'success';

  if (resolvedAction === 'in') {
    if (record.isLatePenalty) {
      notificationTitle = 'Attendance: Half Day Deduction Applied';
      notificationMessage = `${req.user.name}, this is your ${record.lateCountInMonth || 3}th late check-in this month. Every 3 late check-ins cuts half a day: 4.5 hours have been deducted from your working hours.`;
      notificationType = 'danger';
    } else if (record.isLateCheckIn) {
      notificationTitle = 'Attendance: Late Check-In Recorded';
      notificationMessage = `${req.user.name}, your check-in was recorded as Late (${record.lateMinutes || 0} mins late after grace period). Late check-in #${record.lateCountInMonth || 1} this month. Every 3 late check-ins results in a half-day (4.5h) deduction.`;
      notificationType = 'warning';
    }
  }

  await dispatchNotifications({
    recipients: req.user._id,
    title: notificationTitle,
    message: notificationMessage,
    type: notificationType,
    link: '/attendance',
    createdBy: req.user._id,
    metadata: {
      attendanceId: record._id,
      action: resolvedAction,
      isLateCheckIn: record.isLateCheckIn,
      isLatePenalty: record.isLatePenalty,
      lateMinutes: record.lateMinutes,
      penaltyDeductionHours: record.penaltyDeductionHours,
      lateCountInMonth: record.lateCountInMonth,
      lateReason: record.lateReason || undefined,
    },
  });

  if (resolvedAction === 'in' && record.isLateCheckIn && record.lateReason) {
    await dispatchNotifications({
      roles: ['admin', 'super admin', 'hr'],
      title: `Late Check-In: ${req.user.name}`,
      message: `${req.user.name} checked in ${record.lateMinutes || 0}m late. Reason: "${record.lateReason}".`,
      type: 'warning',
      link: '/attendance',
      createdBy: req.user._id,
      metadata: {
        attendanceId: record._id,
        userId: req.user._id,
        userName: req.user.name,
        lateMinutes: record.lateMinutes,
        lateReason: record.lateReason,
      },
    });
  }

  return res.json({
    message: resolvedAction === 'in'
      ? (record.isLatePenalty ? 'Punched in (3rd Late Check-in: Half Day penalty cut applied)' : record.isLateCheckIn ? 'Punched in (Late Check-in)' : 'Punch in recorded')
      : 'Punch out recorded',
    record: populated[0]
  });
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
    const diffHours = Math.max(0, (record.logoutTime.getTime() - record.loginTime.getTime()) / 3600000);
    record.totalHours = diffHours;
    if (diffHours < 7) {
      record.status = 'Half Day';
    }
    await record.save();

    await writeAuditLog(req, 'attendance.auto_punch_out', 'Attendance', record._id, {
      reason: 'overtime_unanswered_timeout',
      totalHours: record.totalHours,
      status: record.status,
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
      isEarlyCheckout: diffHours < 7,
      totalHours: diffHours,
      status: record.status,
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
  const totalHours = record ? (record.totalHours || (logoutTime && loginTime ? Math.max(0, (new Date(logoutTime).getTime() - new Date(loginTime).getTime()) / 3600000) : 0)) : 0;
  const isEarlyCheckout = Boolean(isShiftCompleted && (totalHours < 7 || record?.status === 'Half Day'));

  const graceMinutes = Number(shiftDetails.shift?.gracePeriod ?? 15);
  let isLatePending = false;
  let pendingLateMinutes = 0;
  let projectedLateCount = 0;

  if (!loginTime && !isShiftCompleted && shiftDetails.shiftStart) {
    const lateThreshold = new Date(shiftDetails.shiftStart.getTime() + graceMinutes * 60 * 1000);
    if (now > lateThreshold) {
      isLatePending = true;
      pendingLateMinutes = Math.max(0, Math.round((now.getTime() - shiftDetails.shiftStart.getTime()) / 60000));

      const istLogical = getISTComponents(shiftDetails.logicalDate);
      const startOfMonth = createFromIST(istLogical.year, istLogical.month, 1, 0, 0, 0, 0);
      const previousLates = await Attendance.countDocuments({
        user: req.user._id,
        date: { $gte: startOfMonth, $lt: shiftDetails.logicalDate },
        $or: [
          { isLateCheckIn: true },
          { status: 'Late' },
          { isLatePenalty: true },
        ],
      });
      projectedLateCount = previousLates + 1;
    }
  }

  return res.json({
    hasRecord: Boolean(record),
    isPunchedIn,
    isShiftCompleted,
    isEarlyCheckout,
    totalHours,
    grossHours: record?.grossHours || totalHours,
    status: record?.status || null,
    isLateCheckIn: Boolean(record?.isLateCheckIn),
    lateReason: record?.lateReason || null,
    isLatePenalty: Boolean(record?.isLatePenalty),
    penaltyDeductionHours: record?.penaltyDeductionHours || 0,
    lateCountInMonth: record?.lateCountInMonth || 0,
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
    graceMinutes,
    isLatePending,
    pendingLateMinutes,
    projectedLateCount,
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

  const previousStatus = record.status || 'None';

  if (req.body.status !== undefined) {
    record.status = validators.enumValue(req.body.status, ['Present', 'Absent', 'Late', 'Half Day'], 'status');
    record.isManualOverride = true;
  }
  if (req.body.isLateCheckIn !== undefined) record.isLateCheckIn = Boolean(req.body.isLateCheckIn);
  if (req.body.isLatePenalty !== undefined) record.isLatePenalty = Boolean(req.body.isLatePenalty);
  if (req.body.penaltyDeductionHours !== undefined) record.penaltyDeductionHours = Number(req.body.penaltyDeductionHours);
  if (req.body.reason !== undefined) record.manualOverrideReason = String(req.body.reason).trim();
  record.updatedBy = req.user._id;

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
  if (record.status === 'Absent' && !req.body.loginTime && !req.body.logoutTime) {
    record.loginTime = null;
    record.logoutTime = null;
    record.totalHours = 0;
    record.grossHours = 0;
  }
  if (record.loginTime && record.logoutTime && record.logoutTime < record.loginTime) {
    throw new AppError('Logout time must be after login time', 400, 'INVALID_TIME_RANGE');
  }
  await record.save();

  const targetUser = await User.findById(record.user).select('name employeeId email department').lean();
  const dateStr = record.date ? new Date(record.date).toISOString().slice(0, 10) : '';
  const reasonText = record.manualOverrideReason || (req.body.reason ? String(req.body.reason).trim() : 'Manual update by admin');
  const changeSummary = `${req.user.name || 'Admin'} updated attendance for ${targetUser?.name || 'Staff'} (${targetUser?.employeeId || '—'}) on ${dateStr}: Status changed from "${previousStatus}" to "${record.status}"${req.body.reason ? ` — Note: ${reasonText}` : ''}`;

  await writeAuditLog(
    req,
    'attendance.manual_update',
    'Attendance',
    record._id,
    {
      targetUserId: record.user,
      targetUserName: targetUser?.name || 'Staff',
      targetUserEmail: targetUser?.email || '',
      targetUserEmployeeId: targetUser?.employeeId || '',
      date: dateStr,
      previousStatus,
      newStatus: record.status,
      loginTime: record.loginTime,
      logoutTime: record.logoutTime,
      totalHours: record.totalHours,
      reason: reasonText,
      summary: changeSummary,
    },
    {
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      targetUserName: targetUser?.name || 'Staff',
      targetUserEmployeeId: targetUser?.employeeId || '',
      summary: changeSummary,
    }
  );

  const recordObj = record.toObject();
  const populated = await populateActiveHours([recordObj]);
  res.json({
    ...populated[0],
    summary: changeSummary,
  });
});

const manualUpdateAttendance = asyncHandler(async (req, res) => {
  const { userId, date, status, loginTime, logoutTime, reason } = req.body;
  validators.ensure(userId, 'Employee userId is required', 'userId');
  validators.ensure(date, 'Date is required', 'date');

  let targetUser = null;
  if (mongoose.isValidObjectId(userId)) {
    targetUser = await User.findById(userId);
  }
  if (!targetUser) {
    targetUser = await User.findOne({ employeeId: userId, deletedAt: null });
  }
  if (!targetUser) throw new AppError('Employee not found', 404, 'USER_NOT_FOUND');

  const parsedDate = new Date(date);
  validators.ensure(!Number.isNaN(parsedDate.getTime()), 'Valid date is required', 'date');
  const logicalDate = startOfLogicalShiftDay(parsedDate);

  const validStatus = validators.enumValue(status, ['Present', 'Absent', 'Late', 'Half Day'], 'status');

  let record = await Attendance.findOne({ user: targetUser._id, date: logicalDate });
  const isNew = !record;
  const previousStatus = record ? record.status : 'None (No Record)';

  if (!record) {
    record = new Attendance({
      user: targetUser._id,
      date: logicalDate,
    });
  }

  record.status = validStatus;
  record.isManualOverride = true;
  record.manualOverrideReason = reason ? String(reason).trim() : 'Manual attendance update by admin';
  record.updatedBy = req.user._id;

  if (loginTime !== undefined) {
    record.loginTime = loginTime ? new Date(loginTime) : null;
  }
  if (logoutTime !== undefined) {
    record.logoutTime = logoutTime ? new Date(logoutTime) : null;
  }

  if (validStatus === 'Absent' && !loginTime && !logoutTime) {
    record.loginTime = null;
    record.logoutTime = null;
    record.totalHours = 0;
    record.grossHours = 0;
  }

  if (record.loginTime && record.logoutTime && record.logoutTime < record.loginTime) {
    throw new AppError('Logout time must be after login time', 400, 'INVALID_TIME_RANGE');
  }

  await record.save();

  const dateStr = logicalDate.toISOString().slice(0, 10);
  const reasonText = record.manualOverrideReason;
  const changeSummary = `${req.user.name || 'Admin'} updated attendance for ${targetUser.name} (${targetUser.employeeId || 'Staff'}) on ${dateStr}: Status set from "${previousStatus}" to "${record.status}"${reason ? ` — Note: ${reasonText}` : ''}`;

  await writeAuditLog(
    req,
    'attendance.manual_update',
    'Attendance',
    record._id,
    {
      targetUserId: targetUser._id,
      targetUserName: targetUser.name,
      targetUserEmail: targetUser.email,
      targetUserEmployeeId: targetUser.employeeId,
      date: dateStr,
      previousStatus,
      newStatus: record.status,
      loginTime: record.loginTime,
      logoutTime: record.logoutTime,
      totalHours: record.totalHours,
      reason: reasonText,
      summary: changeSummary,
    },
    {
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      targetUserName: targetUser.name,
      targetUserEmployeeId: targetUser.employeeId,
      summary: changeSummary,
      actionType: isNew ? 'CREATE_OVERRIDE' : 'UPDATE_OVERRIDE',
    }
  );

  const populated = await populateActiveHours([record.toObject()]);
  res.json({
    ...populated[0],
    summary: changeSummary,
  });
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
  manualUpdateAttendance,
  autoResolveMissingPunches,
  getShiftStatus,
  extendShift,
};
