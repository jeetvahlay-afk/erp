const Task = require('../models/Task');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');

const taskQuery = (req) => {
  const query = req.query.scope === 'assigned' ? { assignedBy: req.user._id } : { assignee: req.user._id };
  if (req.query.status) query.status = validators.enumValue(req.query.status, ['pending', 'in progress', 'completed'], 'status');
  if (req.query.due === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    query.dueDate = { $gte: start, $lt: end };
  }
  return query;
};

const listTasks = asyncHandler(async (req, res) => {
  const items = await Task.find(taskQuery(req)).populate('assignee assignedBy', 'name employeeId profileImage').sort({ dueDate: 1, createdAt: -1 }).lean();
  res.json(items);
});

const createTask = asyncHandler(async (req, res) => {
  const assignee = req.body.assignee || req.user._id;
  validators.objectId(assignee, 'assignee');
  const exists = await User.exists({ _id: assignee, deletedAt: null, isActive: true });
  validators.ensure(exists, 'Selected assignee is unavailable', 'assignee');
  const task = await Task.create({ title: validators.requiredString(req.body.title, 'title', { max: 180 }), description: validators.optionalString(req.body.description, 'description', { max: 3000 }) || '', assignee, assignedBy: req.user._id, priority: req.body.priority ? validators.enumValue(req.body.priority, ['low', 'medium', 'high'], 'priority') : 'medium', dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null });
  res.status(201).json(await Task.findById(task._id).populate('assignee assignedBy', 'name employeeId profileImage'));
});

const updateTask = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'task id');
  const task = await Task.findOne({ _id: req.params.id, $or: [{ assignee: req.user._id }, { assignedBy: req.user._id }] });
  if (!task) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  if (req.body.status) { task.status = validators.enumValue(req.body.status, ['pending', 'in progress', 'completed'], 'status'); task.completedAt = task.status === 'completed' ? new Date() : null; }
  if (req.body.title && task.assignedBy.equals(req.user._id)) task.title = validators.requiredString(req.body.title, 'title', { max: 180 });
  await task.save();
  res.json(await Task.findById(task._id).populate('assignee assignedBy', 'name employeeId profileImage'));
});

module.exports = { listTasks, createTask, updateTask };
