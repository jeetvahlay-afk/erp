const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Interview = require('../models/Interview');
const AssessmentCandidate = require('../models/AssessmentCandidate');
const Payroll = require('../models/Payroll');
const Department = require('../models/Department');
const BreakLog = require('../models/BreakLog');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { startOfLogicalShiftDay, createFromIST, getISTComponents, isIsoDate, isIsoMonth } = require('../utils/date');

const parseDashboardDate = (dateParam) => {
  if (dateParam && isIsoDate(dateParam)) {
    const [y, m, d] = String(dateParam).split('-').map(Number);
    return createFromIST(y, m - 1, d, 12, 0, 0, 0);
  }
  const parsed = dateParam ? new Date(dateParam) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const ADMIN_ROLES = new Set(['admin', 'super admin']);
const HR_ROLES = new Set(['admin', 'super admin', 'hr']);
const RECRUITMENT_ROLES = new Set(['admin', 'super admin', 'hr', 'recruiter']);

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};
const endOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};
const startOfMonth = (value = new Date()) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};
const startOfYear = (value = new Date()) => new Date(new Date(value).getFullYear(), 0, 1);
const addDays = (value, amount) => {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};
const isoMonth = (date = new Date()) => date.toISOString().slice(0, 7);
const sum = (values) => values.reduce((total, value) => total + Number(value || 0), 0);
const round = (value, digits = 1) => Number(Number(value || 0).toFixed(digits));
const percentage = (value, total) => (total > 0 ? round((value / total) * 100, 1) : 0);

const DASHBOARD_PERMISSIONS = {
  admin: ['employees.read'],
  hr: ['employees.read', 'attendance.read', 'leaves.read'],
  payroll: ['payroll.read'],
  recruitment: ['recruitment.read'],
  attendance: ['attendance.read'],
};

const requireRole = (user, roles, view) => {
  const assigned = new Set(user.permissions || []);
  const allowedByPermission = assigned.has('*') || (DASHBOARD_PERMISSIONS[view] || []).some((permission) => assigned.has(permission));
  if (!roles.has(user.role) && !allowedByPermission) throw new AppError(`You are not authorized to view the ${view} dashboard`, 403, 'FORBIDDEN');
};

const getLeavePolicy = async () => {
  const settings = await Settings.findOne({ type: 'leave-policy' }).lean();
  const configured = settings?.config?.entitlements;
  return {
    'Sick Leave': Number(configured?.['Sick Leave'] ?? 0),
    'Casual Leave': Number(configured?.['Casual Leave'] ?? 0),
    'Paid Leave': Number(configured?.['Paid Leave'] ?? 12),
    'Unpaid Leave': Number(configured?.['Unpaid Leave'] ?? 0),
    'Birthday Leave': Number(configured?.['Birthday Leave'] ?? 1),
  };
};

const getDepartmentDistribution = (department = null) => {
  const match = { deletedAt: null, isActive: true };
  if (department) match.department = department;
  return User.aggregate([
    { $match: match },
    { $group: { _id: { $ifNull: ['$department', 'Unassigned'] }, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $project: { _id: 0, label: '$_id', value: '$count' } },
  ]);
};

const getWeeklyAttendance = async (department = null) => {
  const today = startOfDay();
  const from = addDays(today, -6);
  const userFilter = { deletedAt: null, isActive: true };
  if (department) userFilter.department = department;

  const [scopedUserIds, activeEmployees] = await Promise.all([
    department ? User.find(userFilter).distinct('_id') : null,
    User.countDocuments(userFilter),
  ]);

  const matchStage = { date: { $gte: from, $lte: endOfDay(today) } };
  if (scopedUserIds) matchStage.user = { $in: scopedUserIds };

  const rows = await Attendance.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        present: { $sum: { $cond: [{ $in: ['$status', ['Present', 'Late', 'Half Day']] }, 1, 0] } },
        late: { $sum: { $cond: [{ $or: [{ $eq: ['$status', 'Late'] }, { $eq: ['$isLateCheckIn', true] }] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
      },
    },
  ]);
  const byDate = new Map(rows.map((row) => [row._id, row]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(from, index);
    const key = date.toISOString().slice(0, 10);
    const row = byDate.get(key) || {};
    const present = row.present || 0;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const computedAbsent = (row.absent && row.absent > 0)
      ? row.absent
      : (!isWeekend && date <= today ? Math.max(0, activeEmployees - present) : 0);
    return {
      date: key,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      present,
      late: row.late || 0,
      absent: computedAbsent,
    };
  });
};

const getMonthlyAttendance = async (department = null) => {
  const today = startOfDay();
  const mStart = startOfMonth(today);
  const userFilter = { deletedAt: null, isActive: true };
  if (department) userFilter.department = department;

  const [scopedUserIds, activeEmployees] = await Promise.all([
    department ? User.find(userFilter).distinct('_id') : null,
    User.countDocuments(userFilter),
  ]);

  const matchStage = { date: { $gte: mStart, $lte: endOfDay(today) } };
  if (scopedUserIds) matchStage.user = { $in: scopedUserIds };

  const rows = await Attendance.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        present: { $sum: { $cond: [{ $in: ['$status', ['Present', 'Late', 'Half Day']] }, 1, 0] } },
        late: { $sum: { $cond: [{ $or: [{ $eq: ['$status', 'Late'] }, { $eq: ['$isLateCheckIn', true] }] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
      },
    },
  ]);
  const byDate = new Map(rows.map((row) => [row._id, row]));

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const segments = [
    { label: 'Week 1', start: 1, end: 7 },
    { label: 'Week 2', start: 8, end: 14 },
    { label: 'Week 3', start: 15, end: 21 },
    { label: 'Week 4', start: 22, end: 28 },
    { label: 'Week 5', start: 29, end: daysInMonth },
  ];

  return segments.map((seg) => {
    let sumPresent = 0;
    let sumLate = 0;
    let sumAbsent = 0;
    let workingDays = 0;

    for (let day = seg.start; day <= seg.end; day++) {
      const d = new Date(today.getFullYear(), today.getMonth(), day);
      if (d > today) break;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      if (!isWeekend) workingDays += 1;
      const key = d.toISOString().slice(0, 10);
      const row = byDate.get(key) || {};
      const p = row.present || 0;
      sumPresent += p;
      sumLate += (row.late || 0);
      const computedAbsent = (row.absent && row.absent > 0)
        ? row.absent
        : (!isWeekend ? Math.max(0, activeEmployees - p) : 0);
      sumAbsent += computedAbsent;
    }

    const divisor = Math.max(1, workingDays);
    return {
      label: seg.label,
      present: Math.round(sumPresent / divisor),
      late: Math.round(sumLate / divisor),
      absent: Math.round(sumAbsent / divisor),
      totalPresent: sumPresent,
      workingDays,
    };
  });
};

const getPayrollTrend = async (department = null) => {
  const monthStart = startOfMonth();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth() - (5 - index), 1);
    return { key: isoMonth(date), label: date.toLocaleDateString('en-US', { month: 'short' }) };
  });
  const match = { month: { $in: months.map((month) => month.key) } };
  if (department) {
    const deptUserIds = await User.find({ department, deletedAt: null }).distinct('_id');
    match.user = { $in: deptUserIds };
  }
  const rows = await Payroll.aggregate([
    { $match: match },
    { $group: { _id: '$month', gross: { $sum: '$baseSalary' }, net: { $sum: '$netSalary' }, count: { $sum: 1 } } },
  ]);
  const byMonth = new Map(rows.map((row) => [row._id, row]));
  return months.map((month) => ({ ...month, ...(byMonth.get(month.key) || { gross: 0, net: 0, count: 0 }) }));
};

const getRecruitmentFunnel = async () => {
  // Query all active recruitment candidates
  const interviews = await Interview.find({ deletedAt: null })
    .select('status stage trainingStatus email candidateCode')
    .lean();

  let assessmentCandidates = [];
  try {
    assessmentCandidates = await AssessmentCandidate.find()
      .select('status colorCategory isVerified email candidateCode')
      .lean();
  } catch {
    // silently continue if collection is empty
  }

  const interviewEmails = new Set(
    interviews.map((i) => String(i.email || '').toLowerCase().trim()).filter(Boolean)
  );
  const interviewCodes = new Set(
    interviews.map((i) => String(i.candidateCode || '').toUpperCase().trim()).filter(Boolean)
  );

  // Find any portal candidates not yet linked/synced to interview collection
  const unlinkedAssessments = assessmentCandidates.filter((a) => {
    const email = String(a.email || '').toLowerCase().trim();
    const code = String(a.candidateCode || '').toUpperCase().trim();
    return (!email || !interviewEmails.has(email)) && (!code || !interviewCodes.has(code));
  });

  let daily = 0;
  let assessment = 0;
  let interview = 0;
  let training = 0;
  let hired = 0;
  let shortlisted = 0;
  let rejected = 0;
  let selected = 0;

  for (const record of interviews) {
    const s = String(record.status || '').toLowerCase().trim();
    const stage = String(record.stage || '').toLowerCase().trim();
    const tStatus = String(record.trainingStatus || '').toLowerCase().trim();

    // 1. Hired / Joined Stage
    if (s === 'joined' || stage.includes('joined') || tStatus === 'joined') {
      hired += 1;
      shortlisted += 1;
    }
    // 2. Training Stage (Ongoing, Completed, Probation, In Training)
    else if (
      stage.includes('training') ||
      ['in training', 'training', 'training candidates', 'all trainees', 'ongoing', 'completed', 'probation', 'moved to probation'].includes(s) ||
      ['ongoing', 'completed', 'probation'].includes(tStatus)
    ) {
      training += 1;
      shortlisted += 1;
    }
    // 3. Interview Stage (1st Round, 2nd Round, Selected, Rejected)
    else if (
      stage.includes('interview') ||
      s.includes('1st round') ||
      s.includes('2nd round') ||
      s === 'selected' ||
      s === 'rejected'
    ) {
      interview += 1;
      if (s === 'selected') selected += 1;
      if (s === 'rejected') rejected += 1;
      else shortlisted += 1;
    }
    // 4. Assessment Stage (Pending, Running, Red, Yellow, Green, Assessment Done)
    else if (
      stage.includes('assessment') ||
      ['pending', 'running', 'red', 'yellow', 'green', 'assessment done'].includes(s) ||
      s.includes('assessment')
    ) {
      assessment += 1;
      // Green, Yellow, and completed assessments count as shortlisted for interview review
      if (['green', 'yellow', 'assessment done'].includes(s)) {
        shortlisted += 1;
      }
    }
    // 5. Daily Candidate Intake Stage (New candidate info, scheduled, reschedule, etc.)
    else {
      daily += 1;
      if (s === 'interview scheduled' || s === 'scheduled') {
        shortlisted += 1;
      }
    }
  }

  // Account for any unlinked assessment candidate registrations
  for (const a of unlinkedAssessments) {
    const s = String(a.status || '').toLowerCase().trim();
    const cat = String(a.colorCategory || '').toLowerCase().trim();
    assessment += 1;
    if (['green', 'yellow'].includes(cat) || s === 'completed') {
      shortlisted += 1;
    }
  }

  const applied = interviews.length + unlinkedAssessments.length;

  return {
    applied,
    daily,
    assessment,
    shortlisted: Math.max(shortlisted, interview + training + hired),
    interviewed: interview,
    interview,
    training,
    hired,
    rejected,
    selected,
  };
};

const adminDashboard = async (query = {}, reqUser = null) => {
  const validDate = parseDashboardDate(query.date);
  const today = query.date && isIsoDate(query.date) ? startOfLogicalShiftDay(query.date) : startOfLogicalShiftDay(validDate);
  const month = query.month && isIsoMonth(query.month) ? query.month : isoMonth(validDate);
  const monthStart = startOfMonth(validDate);

  const isDeptScoped = reqUser?.dataScope === 'department' && reqUser.department;
  const userFilter = { deletedAt: null };
  if (isDeptScoped) userFilter.department = reqUser.department;

  const [scopedUserIds] = await Promise.all([
    isDeptScoped ? User.find(userFilter).distinct('_id') : null,
  ]);

  const attPresentQuery = { date: today, status: { $in: ['Present', 'Late', 'Half Day'] } };
  const attLateQuery = { date: today, $or: [{ status: 'Late' }, { isLateCheckIn: true }] };
  const leavePendingQuery = { status: 'Pending' };
  const payrollQuery = { month };
  if (isDeptScoped) {
    attPresentQuery.user = { $in: scopedUserIds };
    attLateQuery.user = { $in: scopedUserIds };
    leavePendingQuery.user = { $in: scopedUserIds };
    payrollQuery.user = { $in: scopedUserIds };
  }

  const [
    totalEmployees, activeEmployees, inactiveEmployees, newJoiners, departments,
    presentToday, lateToday, pendingLeaves, payrollRows, upcomingInterviews,
    distribution, weeklyAttendance, monthlyAttendance, payrollTrend, pendingApprovalRows, recentCandidates,
    recruitment, lateRows,
  ] = await Promise.all([
    User.countDocuments(userFilter),
    User.countDocuments({ ...userFilter, isActive: true }),
    User.countDocuments({ ...userFilter, isActive: false }),
    User.countDocuments({ ...userFilter, createdAt: { $gte: monthStart } }),
    isDeptScoped ? 1 : Department.countDocuments({ isActive: true }),
    Attendance.countDocuments(attPresentQuery),
    Attendance.countDocuments(attLateQuery),
    Leave.countDocuments(leavePendingQuery),
    Payroll.find(payrollQuery).select('netSalary paymentStatus').lean(),
    Interview.countDocuments({
      interviewDate: { $gte: startOfDay(validDate) },
      status: { $nin: ['Rejected', 'Joined', 'Completed', 'Left', 'Ineligible', 'Discontinued'] },
    }),
    getDepartmentDistribution(isDeptScoped ? reqUser.department : null),
    getWeeklyAttendance(isDeptScoped ? reqUser.department : null),
    getMonthlyAttendance(isDeptScoped ? reqUser.department : null),
    getPayrollTrend(isDeptScoped ? reqUser.department : null),
    Leave.find(leavePendingQuery).populate('user', 'name employeeId department profileImage').sort({ createdAt: 1 }).limit(5).lean(),
    Interview.find().sort({ entryDate: -1, createdAt: -1 }).limit(5).lean(),
    getRecruitmentFunnel(),
    Attendance.find(attLateQuery)
      .populate('user', 'name department employeeId profileImage')
      .sort({ loginTime: 1 })
      .limit(10)
      .lean(),
  ]);
  const payrollNet = sum(payrollRows.map((row) => row.netSalary));
  const paidCount = payrollRows.filter((row) => row.paymentStatus === 'paid').length;
  return {
    view: 'admin', generatedAt: new Date(),
    selectedDate: validDate.toISOString().slice(0, 10),
    selectedMonth: month,
    kpis: { totalEmployees, activeEmployees, inactiveEmployees, newJoiners, departments, presentToday, lateToday, absentToday: Math.max(0, activeEmployees - presentToday), pendingLeaves, upcomingInterviews, payrollNet, payrollCount: payrollRows.length, paidCount },
    distribution, weeklyAttendance, monthlyAttendance, payrollTrend,
    pendingApprovals: pendingApprovalRows,
    recentCandidates,
    recruitment,
    lateArrivals: lateRows,
  };
};

const employeeDashboard = async (user, query = {}) => {
  const validDate = parseDashboardDate(query.date);
  const now = validDate;
  const today = query.date && isIsoDate(query.date) ? startOfLogicalShiftDay(query.date) : startOfLogicalShiftDay(validDate);
  const weekStart = addDays(startOfDay(validDate), -6);
  const monthStart = startOfMonth(validDate);
  const yearStart = startOfYear(validDate);
  const [employee, attendanceRows, todayAttendance, breaks, leaves, policy, payroll, notifications] = await Promise.all([
    User.findById(user._id).lean(),
    Attendance.find({ user: user._id, date: { $gte: yearStart } }).sort({ date: -1 }).lean(),
    Attendance.findOne({ user: user._id, date: today }).lean(),
    BreakLog.find({ user: user._id, startTime: { $gte: today } }).sort({ startTime: 1 }).lean(),
    Leave.find({ user: user._id, startDate: { $gte: yearStart } }).sort({ createdAt: -1 }).lean(),
    getLeavePolicy(),
    Payroll.findOne({ user: user._id }).sort({ month: -1 }).lean(),
    Notification.find({ recipient: user._id }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  const approvedLeaves = leaves.filter((leave) => leave.status === 'Approved');
  const usedByType = approvedLeaves.reduce((map, leave) => {
    const days = Math.floor((new Date(leave.endDate) - new Date(leave.startDate)) / 86400000) + 1;
    map[leave.leaveType] = (map[leave.leaveType] || 0) + days;
    return map;
  }, {});
  const leaveBalances = Object.entries(policy).map(([type, entitlement]) => ({
    type,
    entitlement,
    used: usedByType[type] || 0,
    remaining: entitlement > 0 ? Math.max(0, entitlement - (usedByType[type] || 0)) : null,
  }));
  const totalBreakMinutes = sum(breaks.map((item) => item.actualDuration || (item.endTime ? Math.ceil((new Date(item.endTime) - new Date(item.startTime)) / 60000) : 0)));
  const todayHours = todayAttendance
    ? (todayAttendance.totalHours || (todayAttendance.loginTime ? (now - new Date(todayAttendance.loginTime)) / 3600000 : 0))
    : 0;
  const getRowHours = (row) => {
    if (todayAttendance && row._id.toString() === todayAttendance._id.toString()) {
      return todayHours;
    }
    return row.totalHours || 0;
  };
  const weekHours = sum(attendanceRows.filter((row) => new Date(row.date) >= weekStart).map(getRowHours));
  const monthHours = sum(attendanceRows.filter((row) => new Date(row.date) >= monthStart).map(getRowHours));
  const yearlyHours = sum(attendanceRows.map(getRowHours));
  return {
    view: 'employee', generatedAt: new Date(), employee,
    attendance: {
      today: todayAttendance,
      records: attendanceRows.slice(0, 14),
      totalHoursToday: round(todayAttendance?.totalHours || (todayAttendance?.loginTime ? (now - new Date(todayAttendance.loginTime)) / 3600000 : 0), 2),
      totalHoursWeek: round(weekHours, 2),
      totalHoursMonth: round(monthHours, 2),
      totalHoursYear: round(yearlyHours, 2),
      overtimeMonth: round(Math.max(0, monthHours - (attendanceRows.filter((row) => new Date(row.date) >= monthStart).length * 8)), 2),
      breakMinutesToday: totalBreakMinutes,
    },
    leaveBalances,
    leaveSummary: {
      total: sum(Object.values(policy)),
      used: sum(Object.values(usedByType)),
      pending: leaves.filter((leave) => leave.status === 'Pending').length,
      rejected: leaves.filter((leave) => leave.status === 'Rejected').length,
    },
    recentLeaves: leaves.slice(0, 5), payroll, notifications,
  };
};

const hrDashboard = async (query = {}, reqUser = null) => {
  const validDate = parseDashboardDate(query.date);
  const today = query.date && isIsoDate(query.date) ? startOfLogicalShiftDay(query.date) : startOfLogicalShiftDay(validDate);
  const month = query.month && isIsoMonth(query.month) ? query.month : isoMonth(validDate);
  const monthStart = startOfMonth(validDate);

  const isDeptScoped = reqUser?.dataScope === 'department' && reqUser.department;
  const userFilter = { deletedAt: null };
  if (isDeptScoped) userFilter.department = reqUser.department;

  const [scopedUserIds] = await Promise.all([
    isDeptScoped ? User.find(userFilter).distinct('_id') : null,
  ]);

  const attPresentQuery = { date: today, status: { $in: ['Present', 'Late', 'Half Day'] } };
  const attLateQuery = { date: today, $or: [{ status: 'Late' }, { isLateCheckIn: true }] };
  const leavePendingQuery = { status: 'Pending' };
  const payrollMatch = { month };
  if (isDeptScoped) {
    attPresentQuery.user = { $in: scopedUserIds };
    attLateQuery.user = { $in: scopedUserIds };
    leavePendingQuery.user = { $in: scopedUserIds };
    payrollMatch.user = { $in: scopedUserIds };
  }

  const [
    totalEmployees, activeEmployees, newJoiners, lateToday, attendanceToday,
    payroll, distribution, weeklyAttendance, monthlyAttendance, pendingApprovals, upcomingInterviews,
    lateRows, funnel,
  ] = await Promise.all([
    User.countDocuments(userFilter),
    User.countDocuments({ ...userFilter, isActive: true }),
    User.countDocuments({ ...userFilter, createdAt: { $gte: monthStart } }),
    Attendance.countDocuments(attLateQuery),
    Attendance.countDocuments(attPresentQuery),
    Payroll.aggregate([{ $match: payrollMatch }, { $group: { _id: null, net: { $sum: '$netSalary' }, count: { $sum: 1 } } }]),
    getDepartmentDistribution(isDeptScoped ? reqUser.department : null),
    getWeeklyAttendance(isDeptScoped ? reqUser.department : null),
    getMonthlyAttendance(isDeptScoped ? reqUser.department : null),
    Leave.find(leavePendingQuery).populate('user', 'name employeeId department profileImage').sort({ createdAt: 1 }).limit(6).lean(),
    Interview.find({
      interviewDate: { $gte: startOfDay(validDate) },
      status: { $nin: ['Rejected', 'Joined', 'Completed', 'Left', 'Ineligible', 'Discontinued'] },
    })
      .select('candidateName candidatePost phoneNumber interviewDate interviewTime status branch')
      .sort({ interviewDate: 1 })
      .limit(6)
      .lean(),
    Attendance.find(attLateQuery)
      .populate('user', 'name department employeeId profileImage')
      .sort({ loginTime: 1 })
      .limit(10)
      .lean(),
    getRecruitmentFunnel(),
  ]);
  return {
    view: 'hr', generatedAt: new Date(),
    selectedDate: validDate.toISOString().slice(0, 10),
    selectedMonth: month,
    kpis: { totalEmployees, activeEmployees, newJoiners, lateToday, attendanceToday, attendanceRate: percentage(attendanceToday, activeEmployees), payrollCost: payroll[0]?.net || 0 },
    distribution, weeklyAttendance, monthlyAttendance, pendingApprovals, upcomingInterviews, lateArrivals: lateRows, recruitment: funnel,
  };
};

const payrollDashboard = async (query = {}, reqUser = null) => {
  const month = isoMonth();
  const isDeptScoped = reqUser?.dataScope === 'department' && reqUser.department;
  const match = { month };
  if (isDeptScoped) {
    const deptUserIds = await User.find({ department: reqUser.department, deletedAt: null }).distinct('_id');
    match.user = { $in: deptUserIds };
  }
  const [records, trend] = await Promise.all([
    Payroll.find(match).populate('user', 'name employeeId department designation').lean(),
    getPayrollTrend(isDeptScoped ? reqUser.department : null),
  ]);
  const gross = sum(records.map((row) => row.baseSalary + sum(Object.values(row.allowances || {}))));
  const deductions = sum(records.map((row) => sum(Object.values(row.deductions || {}))));
  const net = sum(records.map((row) => row.netSalary));
  const statuses = records.reduce((map, row) => {
    map[row.paymentStatus] = (map[row.paymentStatus] || 0) + 1;
    return map;
  }, {});
  const salaryRanges = [
    { min: 0, max: 30000, label: 'Below 30K' },
    { min: 30000, max: 50000, label: '30K–50K' },
    { min: 50000, max: 80000, label: '50K–80K' },
    { min: 80000, max: 120000, label: '80K–120K' },
    { min: 120000, max: Infinity, label: '120K+' },
  ].map((range) => ({ ...range, count: records.filter((row) => row.netSalary >= range.min && row.netSalary < range.max).length }));
  return {
    view: 'payroll', generatedAt: new Date(), month,
    overview: { gross, deductions, net, count: records.length, average: records.length ? round(net / records.length, 2) : 0, highest: records.length ? Math.max(...records.map((row) => row.netSalary)) : 0, statuses },
    salaryRanges, trend,
    pipeline: [
      { id: 'validation', label: 'Data validation', status: records.length ? 'completed' : 'pending' },
      { id: 'attendance', label: 'Attendance calculation', status: records.length ? 'completed' : 'pending' },
      { id: 'salary', label: 'Salary computation', status: records.length ? 'completed' : 'pending' },
      { id: 'deductions', label: 'Deductions processing', status: statuses.processing ? 'running' : (records.length ? 'completed' : 'pending') },
      { id: 'verification', label: 'Final verification', status: statuses.unpaid ? 'pending' : (records.length ? 'completed' : 'pending') },
      { id: 'payment', label: 'Payment generation', status: statuses.paid === records.length && records.length ? 'completed' : 'pending' },
    ],
    recent: records.slice(0, 8),
  };
};

const recruitmentDashboard = async () => {
  const [funnel, candidates, upcoming, byPost] = await Promise.all([
    getRecruitmentFunnel(),
    Interview.find().sort({ entryDate: -1, createdAt: -1 }).limit(8).lean(),
    Interview.find({
      interviewDate: { $gte: startOfDay() },
      status: { $nin: ['Rejected', 'Joined', 'Completed', 'Left', 'Ineligible', 'Discontinued'] },
    })
      .select('candidateName candidatePost phoneNumber interviewDate interviewTime status branch')
      .sort({ interviewDate: 1 })
      .limit(6)
      .lean(),
    Interview.aggregate([
      { $group: { _id: { $ifNull: ['$candidatePost', 'Unspecified'] }, applicants: { $sum: 1 }, hired: { $sum: { $cond: [{ $eq: ['$status', 'Joined'] }, 1, 0] } } } },
      { $sort: { applicants: -1 } }, { $limit: 8 },
      { $project: { _id: 0, label: '$_id', applicants: 1, hired: 1 } },
    ]),
  ]);
  return { view: 'recruitment', generatedAt: new Date(), funnel, candidates, upcoming, byPost };
};

const attendanceDashboard = async (query = {}, reqUser = null) => {
  let today;
  if (query.date && isIsoDate(query.date)) {
    today = startOfLogicalShiftDay(query.date);
  } else {
    const ist = getISTComponents(new Date());
    today = createFromIST(ist.year, ist.month, ist.date, 0, 0, 0, 0);
  }
  const monthStart = startOfMonth(today);
  const now = new Date();

  const isDeptScoped = reqUser?.dataScope === 'department' && reqUser.department;
  const userFilter = { deletedAt: null, isActive: true };
  if (isDeptScoped) userFilter.department = reqUser.department;

  const [activeEmployees, scopedUserIds] = await Promise.all([
    User.countDocuments(userFilter),
    isDeptScoped ? User.find(userFilter).distinct('_id') : null,
  ]);

  const todayQuery = { date: today };
  const monthlyQuery = { date: { $gte: monthStart } };
  const lateQuery = { date: today, $or: [{ status: 'Late' }, { isLateCheckIn: true }] };
  const breakQuery = { startTime: { $gte: today } };

  if (isDeptScoped) {
    todayQuery.user = { $in: scopedUserIds };
    monthlyQuery.user = { $in: scopedUserIds };
    lateQuery.user = { $in: scopedUserIds };
    breakQuery.user = { $in: scopedUserIds };
  }

  const [todayRows, monthlyRows, weekly, lateEmployees, breaks] = await Promise.all([
    Attendance.find(todayQuery).populate('user', 'name employeeId department profileImage').sort({ loginTime: 1 }).lean(),
    Attendance.find(monthlyQuery).lean(),
    getWeeklyAttendance(isDeptScoped ? reqUser.department : null),
    Attendance.find(lateQuery).populate('user', 'name employeeId department profileImage').sort({ loginTime: 1 }).limit(10).lean(),
    BreakLog.find(breakQuery).lean(),
  ]);
  const present = todayRows.filter((row) => ['Present', 'Late', 'Half Day'].includes(row.status)).length;
  const late = todayRows.filter((row) => row.status === 'Late' || row.isLateCheckIn).length;
  const absent = Math.max(0, activeEmployees - present);

  const getRecordHours = (row) => {
    if (row.totalHours) return row.totalHours;
    if (row.loginTime && !row.logoutTime) {
      return (now - new Date(row.loginTime)) / 3600000;
    }
    return 0;
  };
  const avgHours = monthlyRows.length ? round(sum(monthlyRows.map(getRecordHours)) / monthlyRows.length, 2) : 0;

  const processedTodayRows = todayRows.map((row) => {
    if (row.loginTime && !row.logoutTime) {
      const elapsed = (now - new Date(row.loginTime)) / 3600000;
      return {
        ...row,
        totalHours: round(elapsed, 2),
      };
    }
    return row;
  });

  const missingPunches = todayRows.filter((row) => row.loginTime && !row.logoutTime).length;
  const breakMinutes = sum(breaks.map((row) => row.actualDuration));
  return {
    view: 'attendance', generatedAt: new Date(),
    kpis: { activeEmployees, totalEmployees: activeEmployees, present, late, absent, attendanceRate: percentage(present, activeEmployees), pendingRegularizations: missingPunches, averageHours: avgHours, breakMinutes },
    weekly, todayRows: processedTodayRows, lateEmployees,
  };
};

const buildView = async (view, user, query = {}) => {
  switch (view) {
    case 'employee': return employeeDashboard(user, query);
    case 'admin': requireRole(user, ADMIN_ROLES, view); return adminDashboard(query, user);
    case 'hr': requireRole(user, HR_ROLES, view); return hrDashboard(query, user);
    case 'payroll': requireRole(user, ADMIN_ROLES, view); return payrollDashboard(query, user);
    case 'recruitment': requireRole(user, RECRUITMENT_ROLES, view); return recruitmentDashboard(query, user);
    case 'attendance': requireRole(user, HR_ROLES, view); return attendanceDashboard(query, user);
    default: throw new AppError('Unknown dashboard view', 404, 'DASHBOARD_NOT_FOUND');
  }
};

const getDashboard = asyncHandler(async (req, res) => {
  const view = ADMIN_ROLES.has(req.user.role) ? 'admin' : 'employee';
  res.json(await buildView(view, req.user, req.query));
});

const getDashboardView = asyncHandler(async (req, res) => {
  res.json(await buildView(String(req.params.view || '').toLowerCase(), req.user, req.query));
});

module.exports = { getDashboard, getDashboardView };
