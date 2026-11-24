const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Leave = require('../models/Leave');
const SalaryStructure = require('../models/SalaryStructure');
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { isIsoMonth } = require('../utils/date');
const { writeAuditLog } = require('../services/auditService');
const { dispatchNotifications } = require('../services/notificationService');

const buildPayroll = (user, structure, monthStr, generatedBy, userLeaves, year, monthIndex, daysInMonth, monthStart, monthEnd, settings) => {
  const baseSalary = Number(structure?.baseSalary ?? user.baseSalary ?? 0);
  const dailyRate = baseSalary / daysInMonth;

  let totalUnpaidDays = 0;

  userLeaves.forEach((leave) => {
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);

    const overlapStart = new Date(Math.max(leaveStart, monthStart));
    const overlapEnd = new Date(Math.min(leaveEnd, monthEnd));

    const overlapDays = overlapStart <= overlapEnd
      ? Math.ceil(Math.abs(overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1
      : 0;

    if (overlapDays > 0) {
      if (leave.leaveType === 'Paid Leave' || leave.leaveType === 'Birthday Leave') {
        const noticeDays = (new Date(leave.startDate) - new Date(leave.createdAt)) / (1000 * 60 * 60 * 24);
        if (noticeDays >= 7) {
          // Informed 7 days before: Paid leave (no deduction)
        } else {
          // Not informed 7 days before: Unpaid leave (deducted)
          totalUnpaidDays += overlapDays;
        }
      } else {
        // All other leave types (Sick Leave, Casual Leave, Unpaid Leave, etc.) are always unpaid (deducted)
        totalUnpaidDays += overlapDays;
      }
    }
  });

  const unpaidLeaveDeduction = Math.round(totalUnpaidDays * dailyRate);

  let leaveEncashmentAmount = 0;

  if (monthIndex === 12) {
    let totalUnusedPaidDays = 0;
    
    for (let m = 1; m <= 12; m++) {
      const mStart = new Date(year, m - 1, 1);
      const mEnd = new Date(year, m, 0, 23, 59, 59, 999);
      
      let mValidPaidDays = 0;
      userLeaves.forEach((leave) => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        const overlapStart = new Date(Math.max(leaveStart, mStart));
        const overlapEnd = new Date(Math.min(leaveEnd, mEnd));
        if (overlapStart <= overlapEnd) {
          if (leave.leaveType === 'Paid Leave') {
            const noticeDays = (new Date(leave.startDate) - new Date(leave.createdAt)) / (1000 * 60 * 60 * 24);
            if (noticeDays >= 7) {
              mValidPaidDays += Math.ceil(Math.abs(overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
            }
          }
        }
      });
      
      const mPaidConsumed = Math.min(1, mValidPaidDays);
      totalUnusedPaidDays += (1 - mPaidConsumed);
    }

    leaveEncashmentAmount = Math.round(totalUnusedPaidDays * dailyRate);
  }

  const allowances = {
    bonus: leaveEncashmentAmount,
    housing: Number(structure?.hra || 0),
    transport: Number(structure?.transportAllowance || 0),
    other: Number(structure?.securityAllowance || 0) + Number(structure?.otherAllowances || 0),
  };

  const deductions = {
    tax: Number(structure?.taxDeduction || 0),
    insurance: 0,
    unpaidLeave: unpaidLeaveDeduction,
    securityDeposit: Number(structure?.securityDeposit || 0),
    pf: Number(structure?.pfDeduction || 0),
    other: Number(structure?.otherDeductions || 0),
  };

  const totalAllowances = Object.values(allowances).reduce((sum, value) => sum + value, 0);
  const totalDeductions = Object.values(deductions).reduce((sum, value) => sum + value, 0);

  return {
    user: user._id,
    month: monthStr,
    baseSalary,
    allowances,
    deductions,
    netSalary: Math.max(0, baseSalary + totalAllowances - totalDeductions),
    paymentStatus: 'unpaid',
    generatedBy,
  };
};

const generatePayrollBatch = asyncHandler(async (req, res) => {
  const month = String(req.body.month || '');
  if (!isIsoMonth(month)) throw new AppError('Month must use YYYY-MM format', 400, 'INVALID_MONTH');

  const [year, monthIndex] = month.split('-').map(Number);
  const startOfYearDate = new Date(year, 0, 1);
  const monthStart = new Date(year, monthIndex - 1, 1);
  const monthEnd = new Date(year, monthIndex, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(year, monthIndex, 0).getDate();

  const [activeUsers, structures, existingPayrolls, leaves, settings] = await Promise.all([
    User.find({ isActive: true, deletedAt: null }).select('_id baseSalary').lean(),
    SalaryStructure.find().lean(),
    Payroll.find({ month }).select('user').lean(),
    Leave.find({
      status: 'Approved',
      startDate: { $gte: startOfYearDate },
      endDate: { $lte: monthEnd },
    }).lean(),
    Settings.findOne({ type: 'leave-policy' }).lean(),
  ]);

  const structureByUser = new Map(structures.map((item) => [String(item.user), item]));
  const existingUserIds = new Set(existingPayrolls.map((item) => String(item.user)));

  const leavesByUser = new Map();
  leaves.forEach((leave) => {
    const userIdStr = String(leave.user);
    if (!leavesByUser.has(userIdStr)) {
      leavesByUser.set(userIdStr, []);
    }
    leavesByUser.get(userIdStr).push(leave);
  });

  const records = [];
  activeUsers.forEach((user) => {
    if (!existingUserIds.has(String(user._id))) {
      const userStructure = structureByUser.get(String(user._id));
      const userLeaves = leavesByUser.get(String(user._id)) || [];
      const record = buildPayroll(
        user,
        userStructure,
        month,
        req.user._id,
        userLeaves,
        year,
        monthIndex,
        daysInMonth,
        monthStart,
        monthEnd,
        settings
      );
      records.push(record);
    }
  });

  if (records.length > 0) {
    await Payroll.insertMany(records, { ordered: false });
    await dispatchNotifications({
      recipients: records.map((record) => record.user),
      title: 'Payroll generated',
      message: `Your payroll statement for ${month} is now available.`,
      type: 'info',
      link: '/my-payroll',
      createdBy: req.user._id,
      metadata: { month },
    });
  }
  await writeAuditLog(req, 'payroll.generated', 'Payroll', undefined, { month, count: records.length });
  res.status(201).json({
    message: `Generated ${records.length} payroll records for ${month}`,
    count: records.length,
    skipped: activeUsers.length - records.length,
  });
});

const getAllPayroll = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user?.dataScope === 'department' && req.user.department) {
    const deptUserIds = await User.find({ department: req.user.department, deletedAt: null }).distinct('_id');
    if (req.query.userId) {
      validators.objectId(req.query.userId, 'userId');
      if (!deptUserIds.some((id) => String(id) === String(req.query.userId))) {
        return res.json([]);
      }
      query.user = req.query.userId;
    } else {
      query.user = { $in: deptUserIds };
    }
  } else if (req.query.userId) {
    validators.objectId(req.query.userId, 'userId');
    query.user = req.query.userId;
  }
  if (req.query.month) {
    if (!isIsoMonth(req.query.month)) throw new AppError('Month must use YYYY-MM format', 400, 'INVALID_MONTH');
    query.month = req.query.month;
  }
  if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus;
  const payrolls = await Payroll.find(query)
    .populate('user', 'name employeeId role department')
    .sort({ month: -1, createdAt: -1 })
    .lean();
  res.json(payrolls);
});

const updatePayrollStatus = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'payroll id');
  const payroll = await Payroll.findById(req.params.id);
  if (!payroll) throw new AppError('Payroll record not found', 404, 'PAYROLL_NOT_FOUND');

  if (req.user?.dataScope === 'department' && req.user.department) {
    const targetUser = await User.findById(payroll.user).select('department');
    if (!targetUser || targetUser.department !== req.user.department) {
      throw new AppError('You can only update payroll records for employees in your department', 403, 'FORBIDDEN');
    }
  }

  if (req.body.paymentStatus) {
    payroll.paymentStatus = validators.enumValue(req.body.paymentStatus, ['unpaid', 'paid', 'processing'], 'paymentStatus');
    payroll.paymentDate = payroll.paymentStatus === 'paid' ? new Date() : undefined;
  }
  if (req.body.paymentMethod) {
    payroll.paymentMethod = validators.enumValue(req.body.paymentMethod, ['bank_transfer', 'cash', 'check', 'other'], 'paymentMethod');
  }
  if (req.body.referenceNumber !== undefined) {
    payroll.referenceNumber = validators.optionalString(req.body.referenceNumber, 'referenceNumber', { max: 120 });
  }
  await payroll.save();
  await writeAuditLog(req, 'payroll.updated', 'Payroll', payroll._id, {
    paymentStatus: payroll.paymentStatus,
    paymentMethod: payroll.paymentMethod,
  });
  if (req.body.paymentStatus) {
    await dispatchNotifications({
      recipients: payroll.user,
      title: 'Payroll status updated',
      message: `Your payroll for ${payroll.month} is now ${payroll.paymentStatus}.`,
      type: payroll.paymentStatus === 'paid' ? 'success' : 'info',
      link: '/my-payroll',
      createdBy: req.user._id,
    sendEmail: true,
      metadata: { payrollId: payroll._id, month: payroll.month, paymentStatus: payroll.paymentStatus },
    });
  }
  res.json(payroll);
});

const getMyPayroll = asyncHandler(async (req, res) => {
  const payrolls = await Payroll.find({ user: req.user._id })
    .populate('user', 'name employeeId role department designation pan')
    .sort({ month: -1 })
    .lean();
  res.json(payrolls);
});

module.exports = { generatePayrollBatch, getAllPayroll, updatePayrollStatus, getMyPayroll };
