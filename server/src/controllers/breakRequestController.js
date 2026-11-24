const BreakRequest = require('../models/BreakRequest');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { writeAuditLog } = require('../services/auditService');
const { dispatchNotifications, dispatchToActiveRoles } = require('../services/notificationService');

const requestBreak = asyncHandler(async (req, res) => {
  const reason = validators.requiredString(req.body.reason, 'reason', { min: 3, max: 500 });
  const requestedDuration = validators.number(req.body.requestedDuration, 'requestedDuration', { min: 1, max: 240 });
  const pending = await BreakRequest.exists({ user: req.user._id, status: 'Pending' });
  if (pending) throw new AppError('You already have a pending break request', 409, 'PENDING_REQUEST_EXISTS');

  const request = await BreakRequest.create({ user: req.user._id, reason, requestedDuration });
  await writeAuditLog(req, 'break_request.created', 'BreakRequest', request._id, { requestedDuration });
  await dispatchToActiveRoles(['admin', 'super admin'], {
    title: 'Break approval requested',
    message: `${req.user.name} requested an additional ${requestedDuration}-minute break.`,
    type: 'action',
    link: '/manage-breaks',
    createdBy: req.user._id,
    metadata: { breakRequestId: request._id },
  });
  res.status(201).json(request);
});

const getMyRequests = asyncHandler(async (req, res) => {
  const requests = await BreakRequest.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json(requests);
});

const getAllRequests = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user?.dataScope === 'department' && req.user.department) {
    const deptUserIds = await User.find({ department: req.user.department, deletedAt: null }).distinct('_id');
    query.user = { $in: deptUserIds };
  }
  const requests = await BreakRequest.find(query)
    .populate('user', 'name email employeeId department')
    .populate('reviewedBy', 'name employeeId')
    .sort({ createdAt: -1 })
    .lean();
  res.json(requests);
});

const updateRequestStatus = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'request id');
  const inputStatus = req.body.status ? (String(req.body.status).charAt(0).toUpperCase() + String(req.body.status).slice(1).toLowerCase()) : '';
  const status = validators.enumValue(inputStatus, ['Approved', 'Rejected'], 'status');
  const adminComment = validators.optionalString(req.body.adminComment, 'adminComment', { max: 500 });
  const request = await BreakRequest.findById(req.params.id);
  if (!request) throw new AppError('Request not found', 404, 'REQUEST_NOT_FOUND');
  if (request.status !== 'Pending') throw new AppError('Request has already been processed', 409, 'REQUEST_ALREADY_PROCESSED');

  if (req.user?.dataScope === 'department' && req.user.department) {
    const targetUser = await User.findById(request.user).select('department');
    if (!targetUser || targetUser.department !== req.user.department) {
      throw new AppError('You can only review break requests for employees in your department', 403, 'FORBIDDEN');
    }
  }

  request.status = status;
  request.adminComment = adminComment;
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  await request.save();
  await writeAuditLog(req, 'break_request.reviewed', 'BreakRequest', request._id, { status });
  await dispatchNotifications({
    recipients: request.user,
    title: `Break request ${status.toLowerCase()}`,
    message: adminComment || `Your additional break request has been ${status.toLowerCase()}.`,
    type: status === 'Approved' ? 'success' : 'warning',
    link: '/take-break',
    createdBy: req.user._id,
    sendEmail: true,
    metadata: { breakRequestId: request._id, status },
  });
  res.json(request);
});

module.exports = { requestBreak, getMyRequests, getAllRequests, updateRequestStatus };
