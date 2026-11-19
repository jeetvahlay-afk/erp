const Department = require('../models/Department');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const pick = require('../utils/pick');
const { writeAuditLog } = require('../services/auditService');

const FIELDS = ['name', 'code', 'description', 'headName', 'location'];

const getDepartments = asyncHandler(async (_req, res) => {
  const departments = await Department.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'users',
        let: { departmentName: '$name' },
        pipeline: [
          { $match: { $expr: { $eq: ['$department', '$$departmentName'] }, deletedAt: null } },
          { $count: 'count' },
        ],
        as: 'headcount',
      },
    },
    { $addFields: { employeeCount: { $ifNull: [{ $first: '$headcount.count' }, 0] } } },
    { $project: { headcount: 0 } },
  ]);
  res.json(departments);
});

const getDepartmentById = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'department id');
  const department = await Department.findById(req.params.id).lean();
  if (!department) throw new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND');
  const employeeCount = await User.countDocuments({ department: department.name, deletedAt: null });
  res.json({ ...department, employeeCount });
});

const createDepartment = asyncHandler(async (req, res) => {
  const payload = pick(req.body, FIELDS);
  payload.name = validators.requiredString(payload.name, 'name', { max: 120 });
  if (payload.code) payload.code = validators.optionalString(payload.code, 'code', { max: 20 }).toUpperCase();
  const department = await Department.create(payload);
  await writeAuditLog(req, 'department.created', 'Department', department._id, { name: department.name });
  res.status(201).json(department);
});

const updateDepartment = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'department id');
  const department = await Department.findById(req.params.id);
  if (!department) throw new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND');
  const previousName = department.name;
  const payload = pick(req.body, FIELDS);
  if (payload.name !== undefined) payload.name = validators.requiredString(payload.name, 'name', { max: 120 });
  if (payload.code !== undefined) payload.code = validators.optionalString(payload.code, 'code', { max: 20 })?.toUpperCase();
  Object.assign(department, payload);
  await department.save();
  if (department.name !== previousName) {
    await User.updateMany({ department: previousName, deletedAt: null }, { $set: { department: department.name } });
  }
  await writeAuditLog(req, 'department.updated', 'Department', department._id, { previousName, name: department.name });
  res.json(department);
});

const toggleDepartment = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'department id');
  const department = await Department.findById(req.params.id);
  if (!department) throw new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND');
  department.isActive = !department.isActive;
  await department.save();
  await writeAuditLog(req, 'department.status_changed', 'Department', department._id, { isActive: department.isActive });
  res.json(department);
});

const deleteDepartment = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'department id');
  const department = await Department.findById(req.params.id);
  if (!department) throw new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND');
  const assignedUsers = await User.countDocuments({ department: department.name, deletedAt: null });
  if (assignedUsers > 0) throw new AppError(`Department contains ${assignedUsers} employee(s)`, 409, 'DEPARTMENT_IN_USE');
  await department.deleteOne();
  await writeAuditLog(req, 'department.deleted', 'Department', department._id, { name: department.name });
  res.json({ message: 'Department deleted successfully' });
});

module.exports = { getDepartments, getDepartmentById, createDepartment, updateDepartment, toggleDepartment, deleteDepartment };
