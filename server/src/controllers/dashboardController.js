const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Interview = require('../models/Interview');
const Payroll = require('../models/Payroll');
const Department = require('../models/Department');
const BreakLog = require('../models/BreakLog');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { startOfLogicalShiftDay } = require('../utils/date');

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

const getDepartmentDistribution = () => User.aggregate([
  { $match: { deletedAt: null, isActive: true } },
  { $group: { _id: { $ifNull: ['$department', 'Unassigned'] }, count: { $sum: 1 } } },
  { $sort: { count: -1, _id: 1 } },
  { $project: { _id: 0, label: '$_id', value: '$count' } },
]);

const getWeeklyAttendance = async () => {
  const today = startOfDay();
  const from = addDays(today, -6);
  const rows = await Attendance.aggregate([
    { $match: { date: { $gte: from, $lte: endOfDay(today) } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        present: { $sum: { $cond: [{ $in: ['$status', ['Present', 'Late', 'Half Day']] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
      },
    },
  ]);
  const byDate = new Map(rows.map((row) => [row._id, row]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(from, index);
    const key = date.toISOString().slice(0, 10);
    const row = byDate.get(key) || {};
    return {
      date: key,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      present: row.present || 0,
      late: row.late || 0,
      absent: row.absent || 0,
    };
  });
};

const getPayrollTrend = async () => {
  const monthStart = startOfMonth();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth() - (5 - index), 1);
    return { key: isoMonth(date), label: date.toLocaleDateString('en-US', { month: 'short' }) };
  });
  const rows = await Payroll.aggregate([
    { $match: { month: { $in: months.map((month) => month.key) } } },
    { $group: { _id: '$month', gross: { $sum: '$baseSalary' }, net: { $sum: '$netSalary' }, count: { $sum: 1 } } },
  ]);
  const byMonth = new Map(rows.map((row) => [row._id, row]));
  return months.map((month) => ({ ...month, ...(byMonth.get(month.key) || { gross: 0, net: 0, count: 0 }) }));
};

const getRecruitmentFunnel = async () => {
  const groups = await Interview.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const counts = new Map(groups.map((group) => [group._id, group.count]));
  return {
    applied: sum([...counts.values()]),
    shortlisted: sum(['1st Round Pending', '1st Round Completed', '2nd Round Pending', '2nd Round Completed', 'Selected', 'Joined', 'Training'].map((key) => counts.get(key))),
    interviewed: sum(['1st Round Completed', '2nd Round Pending', '2nd Round Completed', 'Selected', 'Joined', 'Training'].map((key) => counts.get(key))),
    offered: sum(['Selected', 'Joined', 'Training'].map((key) => counts.get(key))),
    hired: sum(['Joined', 'Training'].map((key) => counts.get(key))),
    rejected: counts.get('Rejected') || 0,
  };
};

const adminDashboard = async () => {
  const today = startOfLogicalShiftDay();
  const month = isoMonth();
  const monthStart = startOfMonth();
  const [
    totalEmployees, activeEmployees, inactiveEmployees, newJoiners, departments,
    presentToday, lateToday, pendingLeaves, payrollRows, upcomingInterviews,
    distribution, weeklyAttendance, payrollTrend, pendingApprovalRows, recentCandidates,
    recruitment,
  ] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    User.countDocuments({ deletedAt: null, isActive: true }),
    User.countDocuments({ deletedAt: null, isActive: false }),
    User.countDocuments({ deletedAt: null, createdAt: { $gte: monthStart } }),
    Department.countDocuments({ isActive: true }),
    Attendance.countDocuments({ date: today, status: { $in: ['Present', 'Late', 'Half Day'] } }),
    Attendance.countDocuments({ date: today, status: 'Late' }),
    Leave.countDocuments({ status: 'Pending' }),
    Payroll.find({ month }).select('netSalary paymentStatus').lean(),
    Interview.countDocuments({ interviewDate: { $gte: new Date() }, status: { $nin: ['Rejected', 'Not Joined', 'Joined'] } }),
    getDepartmentDistribution(),
    getWeeklyAttendance(),
    getPayrollTrend(),
    Leave.find({ status: 'Pending' }).populate('user', 'name employeeId department profileImage').sort({ createdAt: 1 }).limit(5).lean(),
    Interview.find().sort({ entryDate: -1, createdAt: -1 }).limit(5).lean(),
    getRecruitmentFunnel(),
  ]);
  const payrollNet = sum(payrollRows.map((row) => row.netSalary));
  const paidCount = payrollRows.filter((row) => row.paymentStatus === 'paid').length;
  return {
    view: 'admin', generatedAt: new Date(),
    kpis: { totalEmployees, activeEmployees, inactiveEmployees, newJoiners, departments, presentToday, lateToday, absentToday: Math.max(0, activeEmployees - presentToday), pendingLeaves, upcomingInterviews, payrollNet, payrollCount: payrollRows.length, paidCount },
    distribution, weeklyAttendance, payrollTrend,
    pendingApprovals: pendingApprovalRows,
    recentCandidates,
    recruitment,
  };
};

const employeeDashboard = async (user) => {
  const now = new Date();
  const today = startOfLogicalShiftDay(now);
  const weekStart = addDays(startOfDay(now), -6);
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
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

const hrDashboard = async () => {
  const today = startOfLogicalShiftDay();
  const monthStart = startOfMonth();
  const [
    totalEmployees, activeEmployees, newJoiners, lateToday, attendanceToday,
    payroll, distribution, weeklyAttendance, pendingApprovals, upcomingInterviews,
    lateRows, funnel,
  ] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    User.countDocuments({ deletedAt: null, isActive: true }),
    User.countDocuments({ deletedAt: null, createdAt: { $gte: monthStart } }),
    Attendance.countDocuments({ date: today, status: 'Late' }),
    Attendance.countDocuments({ date: today, status: { $in: ['Present', 'Late', 'Half Day'] } }),
    Payroll.aggregate([{ $match: { month: isoMonth() } }, { $group: { _id: null, net: { $sum: '$netSalary' }, count: { $sum: 1 } } }]),
    getDepartmentDistribution(), getWeeklyAttendance(),
    Leave.find({ status: 'Pending' }).populate('user', 'name employeeId department profileImage').sort({ createdAt: 1 }).limit(6).lean(),
    Interview.find({ interviewDate: { $gte: new Date() }, status: { $nin: ['Rejected', 'Not Joined', 'Joined'] } }).sort({ interviewDate: 1 }).limit(5).lean(),
    Attendance.find({ date: today, status: 'Late' }).populate('user', 'name department employeeId profileImage').sort({ loginTime: 1 }).limit(6).lean(),
    getRecruitmentFunnel(),
  ]);
  return {
    view: 'hr', generatedAt: new Date(),
    kpis: { totalEmployees, activeEmployees, newJoiners, lateToday, attendanceToday, attendanceRate: percentage(attendanceToday, activeEmployees), payrollCost: payroll[0]?.net || 0 },
    distribution, weeklyAttendance, pendingApprovals, upcomingInterviews, lateArrivals: lateRows, recruitment: funnel,
  };
};

const payrollDashboard = async () => {
  const month = isoMonth();
  const [records, trend] = await Promise.all([
    Payroll.find({ month }).populate('user', 'name employeeId department designation').lean(),
    getPayrollTrend(),
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
  const now = new Date();
  const [funnel, candidates, upcoming, byPost] = await Promise.all([
    getRecruitmentFunnel(),
    Interview.find().sort({ entryDate: -1, createdAt: -1 }).limit(8).lean(),
    Interview.find({ interviewDate: { $gte: now }, status: { $nin: ['Rejected', 'Not Joined', 'Joined'] } }).sort({ interviewDate: 1 }).limit(6).lean(),
    Interview.aggregate([
      { $group: { _id: { $ifNull: ['$candidatePost', 'Unspecified'] }, applicants: { $sum: 1 }, hired: { $sum: { $cond: [{ $in: ['$status', ['Joined', 'Training']] }, 1, 0] } } } },
      { $sort: { applicants: -1 } }, { $limit: 8 },
      { $project: { _id: 0, label: '$_id', applicants: 1, hired: 1 } },
    ]),
  ]);
  return { view: 'recruitment', generatedAt: new Date(), funnel, candidates, upcoming, byPost };
};

const attendanceDashboard = async () => {
  const today = startOfLogicalShiftDay();
  const monthStart = startOfMonth();
  const now = new Date();
  const [activeEmployees, todayRows, monthlyRows, weekly, lateEmployees, breaks] = await Promise.all([
    User.countDocuments({ deletedAt: null, isActive: true }),
    Attendance.find({ date: today }).populate('user', 'name employeeId department profileImage').sort({ loginTime: 1 }).lean(),
    Attendance.find({ date: { $gte: monthStart } }).lean(),
    getWeeklyAttendance(),
    Attendance.find({ date: today, status: 'Late' }).populate('user', 'name employeeId department profileImage').sort({ loginTime: 1 }).limit(8).lean(),
    BreakLog.find({ startTime: { $gte: today } }).lean(),
  ]);
  const present = todayRows.filter((row) => ['Present', 'Late', 'Half Day'].includes(row.status)).length;
  const late = todayRows.filter((row) => row.status === 'Late').length;
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
    kpis: { activeEmployees, present, late, absent, attendanceRate: percentage(present, activeEmployees), pendingRegularizations: missingPunches, averageHours: avgHours, breakMinutes },
    weekly, todayRows: processedTodayRows, lateEmployees,
  };
};

const buildView = async (view, user) => {
  switch (view) {
    case 'employee': return employeeDashboard(user);
    case 'admin': requireRole(user, ADMIN_ROLES, view); return adminDashboard();
    case 'hr': requireRole(user, HR_ROLES, view); return hrDashboard();
    case 'payroll': requireRole(user, ADMIN_ROLES, view); return payrollDashboard();
    case 'recruitment': requireRole(user, RECRUITMENT_ROLES, view); return recruitmentDashboard();
    case 'attendance': requireRole(user, HR_ROLES, view); return attendanceDashboard();
    default: throw new AppError('Unknown dashboard view', 404, 'DASHBOARD_NOT_FOUND');
  }
};

const getDashboard = asyncHandler(async (req, res) => {
  const view = ADMIN_ROLES.has(req.user.role) ? 'admin' : 'employee';
  res.json(await buildView(view, req.user));
});

const getDashboardView = asyncHandler(async (req, res) => {
  res.json(await buildView(String(req.params.view || '').toLowerCase(), req.user));
});

module.exports = { getDashboard, getDashboardView };
