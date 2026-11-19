const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Leave = require('../models/Leave');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { writeAuditLog } = require('../services/auditService');
const { dispatchNotifications, dispatchToActiveRoles } = require('../services/notificationService');

const getAllLeaves = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.userId) {
    let targetUserId = req.query.userId;
    if (!mongoose.isValidObjectId(targetUserId)) {
      const user = await User.findOne({ employeeId: targetUserId, deletedAt: null }).select('_id');
      if (user) targetUserId = user._id;
      else return res.json([]);
    }
    query.user = targetUserId;
  }
  const leaves = await Leave.find(query)
    .populate('user', 'name email employeeId role department')
    .populate('reviewedBy', 'name employeeId')
    .sort({ createdAt: -1 })
    .lean();
  res.json(leaves);
});

const updateLeaveStatus = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'leave id');
  const status = validators.enumValue(req.body.status, ['Approved', 'Rejected'], 'status');
  const leave = await Leave.findById(req.params.id);
  if (!leave) throw new AppError('Leave request not found', 404, 'LEAVE_NOT_FOUND');
  if (leave.status !== 'Pending') throw new AppError('Leave request has already been processed', 409, 'LEAVE_ALREADY_PROCESSED');

  leave.status = status;
  leave.adminResponse = validators.optionalString(req.body.adminResponse, 'adminResponse', { max: 1000 });
  leave.reviewedBy = req.user._id;
  leave.reviewedAt = new Date();
  await leave.save();
  await writeAuditLog(req, 'leave.reviewed', 'Leave', leave._id, { status });
  await dispatchNotifications({
    recipients: leave.user,
    title: `Leave request ${status.toLowerCase()}`,
    message: leave.adminResponse || `Your ${leave.leaveType.toLowerCase()} request has been ${status.toLowerCase()}.`,
    type: status === 'Approved' ? 'success' : 'warning',
    link: '/leaves',
    createdBy: req.user._id,
    sendEmail: true,
    metadata: { leaveId: leave._id, status },
  });
  res.json({ message: `Leave ${status.toLowerCase()} successfully`, leave });
});

const applyLeave = asyncHandler(async (req, res) => {
  const leaveType = validators.enumValue(req.body.leaveType, ['Sick Leave', 'Casual Leave', 'Paid Leave', 'Unpaid Leave', 'Birthday Leave'], 'leaveType');
  const reason = validators.requiredString(req.body.reason, 'reason', { min: 3, max: 1000 });
  const startDate = new Date(req.body.startDate);
  const endDate = new Date(req.body.endDate);
  validators.ensure(!Number.isNaN(startDate.getTime()), 'Valid start date is required', 'startDate');
  validators.ensure(!Number.isNaN(endDate.getTime()), 'Valid end date is required', 'endDate');
  validators.ensure(endDate >= startDate, 'End date must be on or after start date', 'endDate');

  const overlapping = await Leave.exists({
    user: req.user._id,
    status: { $in: ['Pending', 'Approved'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  if (overlapping) throw new AppError('A pending or approved leave already overlaps this date range', 409, 'OVERLAPPING_LEAVE');

  const leave = await Leave.create({
    user: req.user._id,
    leaveType,
    startDate,
    endDate,
    reason,
    attachment: req.file?.filename,
  });
  await writeAuditLog(req, 'leave.created', 'Leave', leave._id, { leaveType, startDate, endDate });
  await dispatchToActiveRoles(['admin', 'super admin'], {
    title: 'New leave request',
    message: `${req.user.name} submitted a ${leaveType.toLowerCase()} request.`,
    type: 'action',
    link: '/manage-leaves',
    createdBy: req.user._id,
    metadata: { leaveId: leave._id },
  });
  res.status(201).json({ message: 'Leave application submitted successfully', leave });
});

const getMyLeaves = asyncHandler(async (req, res) => {
  const leaves = await Leave.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json(leaves);
});

const downloadAttachment = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'leave id');
  const leave = await Leave.findById(req.params.id).lean();
  if (!leave?.attachment) throw new AppError('Attachment not found', 404, 'ATTACHMENT_NOT_FOUND');
  const isOwner = String(leave.user) === String(req.user._id);
  const isAdmin = ['admin', 'super admin'].includes(req.user.role);
  if (!isOwner && !isAdmin) throw new AppError('You cannot access this attachment', 403, 'FORBIDDEN');

  const filePath = path.resolve(__dirname, '../../uploads/leaves', path.basename(leave.attachment));
  if (!fs.existsSync(filePath)) throw new AppError('Attachment file is unavailable', 404, 'ATTACHMENT_NOT_FOUND');
  res.setHeader('Cache-Control', 'private, no-store');
  res.download(filePath);
});

module.exports = { getAllLeaves, updateLeaveStatus, applyLeave, getMyLeaves, downloadAttachment };
