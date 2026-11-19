const mongoose = require('mongoose');
const WorkReport = require('../models/WorkReport');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const validators = require('../validation/validators');
const { writeAuditLog } = require('../services/auditService');
const { dispatchToActiveRoles } = require('../services/notificationService');

const reportDate = (value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  validators.ensure(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) && !Number.isNaN(date.getTime()), 'A valid report date is required', 'date');
  return date;
};

const payload = (body) => {
  const accomplishments = validators.requiredString(body.accomplishments, 'accomplishments', { min: 3, max: 4000 });
  validators.ensure(/[\p{L}\p{N}]/u.test(accomplishments), 'Notes must describe completed work', 'accomplishments');
  return {
    date: reportDate(body.date),
    hoursWorked: validators.number(body.hoursWorked, 'hoursWorked', { min: 0, max: 24 }),
    completion: validators.number(body.completion, 'completion', { min: 0, max: 100 }),
    accomplishments,
    blockers: validators.optionalString(body.blockers, 'blockers', { max: 2000 }) || '',
    nextPlan: validators.optionalString(body.nextPlan, 'nextPlan', { max: 2000 }) || '',
  };
};

const listMine = asyncHandler(async (req, res) => {
  res.json(await WorkReport.find({ user: req.user._id }).sort({ date: -1 }).limit(365).lean());
});

const saveMine = asyncHandler(async (req, res) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  validators.ensure(String(req.body.date) === today, 'Work reports can only be submitted for today', 'date');
  const values = payload(req.body);
  const report = await WorkReport.findOneAndUpdate(
    { user: req.user._id, date: values.date },
    { $set: values, $setOnInsert: { user: req.user._id } },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await writeAuditLog(req, 'work_report.saved', 'WorkReport', report._id, { date: values.date });
  await dispatchToActiveRoles(['admin', 'super admin'], {
    title: 'Work report submitted', message: `${req.user.name} submitted a daily work report.`, type: 'info',
    link: '/work-reports', createdBy: req.user._id, metadata: { workReportId: report._id },
  });
  res.json(report);
});

const listAll = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.userId) {
    let targetUserId = req.query.userId;
    if (!mongoose.isValidObjectId(targetUserId)) {
      const user = await User.findOne({ employeeId: targetUserId, deletedAt: null }).select('_id');
      if (user) targetUserId = user._id;
      else return res.json([]);
    }
    query.user = targetUserId;
  }
  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) query.date.$gte = reportDate(req.query.from);
    if (req.query.to) query.date.$lte = reportDate(req.query.to);
  }
  res.json(await WorkReport.find(query).populate('user', 'name employeeId department designation profileImage').sort({ date: -1, createdAt: -1 }).limit(2000).lean());
});

module.exports = { listMine, saveMine, listAll };
