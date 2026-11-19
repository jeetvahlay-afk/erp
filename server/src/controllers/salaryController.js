const SalaryStructure = require('../models/SalaryStructure');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const pick = require('../utils/pick');
const { writeAuditLog } = require('../services/auditService');

const MONEY_FIELDS = [
  'baseSalary', 'hra', 'transportAllowance', 'securityAllowance', 'otherAllowances',
  'pfDeduction', 'taxDeduction', 'securityDeposit', 'otherDeductions',
];

const getSalaryStructure = asyncHandler(async (req, res) => {
  validators.objectId(req.params.userId, 'user id');
  const structure = await SalaryStructure.findOne({ user: req.params.userId }).lean();
  res.json(structure || {
    user: req.params.userId,
    baseSalary: 0,
    hra: 0,
    transportAllowance: 0,
    securityAllowance: 0,
    otherAllowances: 0,
    pfDeduction: 0,
    taxDeduction: 0,
    securityDeposit: 0,
    otherDeductions: 0,
    totalAllowance: 0,
    totalDeduction: 0,
    netSalary: 0,
  });
});

const upsertSalaryStructure = asyncHandler(async (req, res) => {
  validators.objectId(req.body.userId, 'user id');
  const user = await User.findOne({ _id: req.body.userId, deletedAt: null });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const values = pick(req.body, MONEY_FIELDS);
  MONEY_FIELDS.forEach((field) => {
    values[field] = validators.number(values[field] ?? 0, field, { min: 0 });
  });

  const structure = await SalaryStructure.findOneAndUpdate(
    { user: req.body.userId },
    { $set: { ...values, updatedBy: req.user._id } },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  // findOneAndUpdate does not execute document pre-validate hooks; calculate explicitly.
  structure.totalAllowance = structure.hra + structure.transportAllowance + structure.securityAllowance + structure.otherAllowances;
  structure.totalDeduction = structure.pfDeduction + structure.taxDeduction + structure.securityDeposit + structure.otherDeductions;
  structure.netSalary = Math.max(0, structure.baseSalary + structure.totalAllowance - structure.totalDeduction);
  await structure.save();
  await User.findByIdAndUpdate(req.body.userId, { $set: { baseSalary: structure.baseSalary } });
  await writeAuditLog(req, 'salary.updated', 'SalaryStructure', structure._id, { userId: req.body.userId });
  res.status(200).json(structure);
});

module.exports = { getSalaryStructure, upsertSalaryStructure };
