const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Leave = require('../models/Leave');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { getISTComponents } = require('../utils/date');
const { writeAuditLog } = require('../services/auditService');
const { dispatchNotifications, dispatchToActiveRoles } = require('../services/notificationService');

const getAllLeaves = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user?.dataScope === 'department' && req.user.department) {
    const deptUserIds = await User.find({ department: req.user.department, deletedAt: null }).distinct('_id');
    if (req.query.userId) {
      let targetUserId = req.query.userId;
      if (!mongoose.isValidObjectId(targetUserId)) {
        const user = await User.findOne({ employeeId: targetUserId, deletedAt: null }).select('_id');
        if (user) targetUserId = user._id;
        else return res.json([]);
      }
      if (!deptUserIds.some((id) => String(id) === String(targetUserId))) {
        return res.json([]);
      }
      query.user = targetUserId;
    } else {
      query.user = { $in: deptUserIds };
    }
  } else if (req.query.userId) {
    let targetUserId = req.query.userId;
    if (!mongoose.isValidObjectId(targetUserId)) {
      const user = await User.findOne({ employeeId: targetUserId, deletedAt: null }).select('_id');
      if (user) targetUserId = user._id;
      else return res.json([]);
    }
    query.user = targetUserId;
  }
  if (req.query.status) query.status = req.query.status;
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

  if (req.user?.dataScope === 'department' && req.user.department) {
    const targetUser = await User.findById(leave.user).select('department');
    if (!targetUser || targetUser.department !== req.user.department) {
      throw new AppError('You can only review leave requests for employees in your department', 403, 'FORBIDDEN');
    }
  }

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

  if (leaveType === 'Birthday Leave') {
    const user = await User.findById(req.user._id).select('dob name').lean();
    if (!user?.dob) {
      throw new AppError('Date of birth is not registered on your profile. Birthday Leave requires a valid date of birth.', 400, 'DOB_REQUIRED');
    }

    const dob = new Date(user.dob);
    if (Number.isNaN(dob.getTime())) {
      throw new AppError('Invalid date of birth on profile.', 400, 'INVALID_DOB');
    }

    const startIst = getISTComponents(startDate);
    const endIst = getISTComponents(endDate);
    const dobIst = getISTComponents(dob);

    const isSingleDay = (startIst?.year === endIst?.year && startIst?.month === endIst?.month && startIst?.date === endIst?.date)
      || (startDate.getUTCFullYear() === endDate.getUTCFullYear() && startDate.getUTCMonth() === endDate.getUTCMonth() && startDate.getUTCDate() === endDate.getUTCDate());

    if (!isSingleDay) {
      throw new AppError('Birthday Leave can only be applied for a single day (your birthday).', 400, 'BIRTHDAY_LEAVE_SINGLE_DAY');
    }

    const matchesBirthday = (startIst?.month === dobIst?.month && startIst?.date === dobIst?.date)
      || (startDate.getUTCMonth() === dob.getUTCMonth() && startDate.getUTCDate() === dob.getUTCDate())
      || (startDate.getMonth() === dob.getMonth() && startDate.getDate() === dob.getDate());

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const birthdayDay = dobIst?.date ?? dob.getUTCDate();
    const birthdayMonth = monthNames[dobIst?.month ?? dob.getUTCMonth()];

    if (!matchesBirthday) {
      throw new AppError(`Birthday Leave can only be applied on your birthday (${birthdayDay} ${birthdayMonth}).`, 400, 'NOT_EMPLOYEE_BIRTHDAY');
    }

    const leaveYear = startIst?.year ?? startDate.getUTCFullYear();
    const existingBirthdayLeave = await Leave.findOne({
      user: req.user._id,
      leaveType: 'Birthday Leave',
      status: { $in: ['Pending', 'Approved'] },
      startDate: {
        $gte: new Date(Date.UTC(leaveYear, 0, 1)),
        $lte: new Date(Date.UTC(leaveYear, 11, 31, 23, 59, 59, 999)),
      },
    });

    if (existingBirthdayLeave) {
      throw new AppError(`Birthday Leave has already been applied or approved for ${leaveYear}.`, 400, 'BIRTHDAY_LEAVE_ALREADY_USED');
    }
  }

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
  const isAdmin = ['admin', 'super admin', 'hr'].includes(req.user.role);
  if (!isOwner && !isAdmin) throw new AppError('You cannot access this attachment', 403, 'FORBIDDEN');

  const filePath = path.resolve(__dirname, '../../uploads/leaves', path.basename(leave.attachment));
  if (!fs.existsSync(filePath)) throw new AppError('Attachment file is unavailable', 404, 'ATTACHMENT_NOT_FOUND');
  res.setHeader('Cache-Control', 'private, no-store');

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
  };
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);

  if (req.query.inline === 'true') {
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(leave.attachment)}"`);
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.download(filePath, path.basename(leave.attachment));
  }
});

module.exports = { getAllLeaves, updateLeaveStatus, applyLeave, getMyLeaves, downloadAttachment };
