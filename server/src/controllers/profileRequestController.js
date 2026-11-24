const ProfileRequest = require('../models/ProfileRequest');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { PROFILE_EDITABLE_FIELDS } = require('../constants/security');
const { writeAuditLog } = require('../services/auditService');
const { dispatchNotifications, dispatchToActiveRoles } = require('../services/notificationService');

const createProfileRequest = asyncHandler(async (req, res) => {
  const field = validators.enumValue(req.body.field, PROFILE_EDITABLE_FIELDS, 'field');
  const newValue = validators.requiredString(req.body.newValue, 'newValue', { max: 1000 });
  const currentUser = await User.findById(req.user._id).lean();
  const oldValue = currentUser?.[field] === undefined || currentUser?.[field] === null ? '' : String(currentUser[field]);
  if (newValue === oldValue) throw new AppError('The requested value is unchanged', 400, 'NO_CHANGE');

  const existing = await ProfileRequest.exists({ user: req.user._id, field, status: 'pending' });
  if (existing) throw new AppError(`You already have a pending request for ${field}`, 409, 'PENDING_REQUEST_EXISTS');

  const profileRequest = await ProfileRequest.create({ user: req.user._id, field, newValue, oldValue });
  await writeAuditLog(req, 'profile_request.created', 'ProfileRequest', profileRequest._id, { field });
  await dispatchToActiveRoles(['admin', 'super admin'], {
    title: 'Profile update requested',
    message: `${req.user.name} requested a change to ${field}.`,
    type: 'action',
    link: '/profile-requests',
    createdBy: req.user._id,
    metadata: { profileRequestId: profileRequest._id, field },
  });
  res.status(201).json(profileRequest);
});

const getMyProfileRequests = asyncHandler(async (req, res) => {
  const requests = await ProfileRequest.find({ user: req.user._id })
    .populate('reviewedBy', 'name employeeId email')
    .sort({ createdAt: -1 })
    .lean();
  res.json(requests);
});

const getAllProfileRequests = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user?.dataScope === 'department' && req.user.department) {
    const deptUserIds = await User.find({ department: req.user.department, deletedAt: null }).distinct('_id');
    query.user = { $in: deptUserIds };
  }
  const requests = await ProfileRequest.find(query)
    .populate('user', 'name employeeId email department profileImage avatar')
    .populate('reviewedBy', 'name employeeId email')
    .sort({ createdAt: -1 })
    .lean();
  res.json(requests);
});

const updateProfileRequestStatus = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'request id');
  const status = validators.enumValue(req.body.status, ['approved', 'rejected'], 'status');
  const request = await ProfileRequest.findById(req.params.id);
  if (!request) throw new AppError('Request not found', 404, 'REQUEST_NOT_FOUND');
  if (request.status !== 'pending') throw new AppError('Request has already been processed', 409, 'REQUEST_ALREADY_PROCESSED');

  if (req.user?.dataScope === 'department' && req.user.department) {
    const targetUser = await User.findById(request.user).select('department');
    if (!targetUser || targetUser.department !== req.user.department) {
      throw new AppError('You can only review profile requests for employees in your department', 403, 'FORBIDDEN');
    }
  }

  if (status === 'approved') {
    const user = await User.findById(request.user);
    if (!user || user.deletedAt) throw new AppError('The target user no longer exists', 404, 'USER_NOT_FOUND');
    user[request.field] = request.field === 'dob' ? new Date(request.newValue) : request.newValue;
    if (request.field === 'firstName' || request.field === 'lastName') {
      user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    await user.save();
  }

  request.status = status;
  request.adminComment = validators.optionalString(req.body.adminComment, 'adminComment', { max: 1000 });
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  await request.save();
  await writeAuditLog(req, 'profile_request.reviewed', 'ProfileRequest', request._id, {
    field: request.field,
    status,
    oldValue: request.oldValue,
    newValue: request.newValue,
    adminComment: request.adminComment,
    targetUser: request.user,
  });
  await dispatchNotifications({
    recipients: request.user,
    title: `Profile update ${status}`,
    message: request.adminComment || `Your request to change ${request.field} was ${status}.`,
    type: status === 'approved' ? 'success' : 'warning',
    link: '/profile',
    createdBy: req.user._id,
    sendEmail: true,
    metadata: { profileRequestId: request._id, field: request.field, status },
  });
  await request.populate([
    { path: 'user', select: 'name employeeId email department profileImage avatar' },
    { path: 'reviewedBy', select: 'name employeeId email' },
  ]);
  res.json(request);
});

module.exports = { createProfileRequest, getMyProfileRequests, getAllProfileRequests, updateProfileRequestStatus };
