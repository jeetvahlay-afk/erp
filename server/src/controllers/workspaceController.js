const User = require('../models/User');
const WorkspaceContent = require('../models/WorkspaceContent');
const asyncHandler = require('../utils/asyncHandler');
const validators = require('../validation/validators');
const { writeAuditLog } = require('../services/auditService');
const { dispatchNotifications } = require('../services/notificationService');

const getContent = asyncHandler(async (req, res) => {
  const kind = validators.enumValue(req.params.kind, ['mail', 'announcement', 'event'], 'kind');
  const query = { kind, isActive: true };
  if (kind === 'mail') query.recipients = req.user._id;
  const items = await WorkspaceContent.find(query)
    .populate('createdBy', 'name profileImage')
    .sort(kind === 'event' ? { startsAt: -1 } : { createdAt: -1 })
    .limit(100)
    .lean();
  res.json(items);
});

const createContent = asyncHandler(async (req, res) => {
  const kind = validators.enumValue(req.params.kind, ['mail', 'announcement', 'event'], 'kind');
  const payload = {
    kind,
    title: validators.requiredString(req.body.title, 'title', { max: 180 }),
    body: validators.requiredString(req.body.body, 'body', { max: 5000 }),
    createdBy: req.user._id,
  };
  if (kind === 'mail') {
    const recipients = Array.isArray(req.body.recipients) ? [...new Set(req.body.recipients.map(String))] : [];
    validators.ensure(recipients.length > 0, 'At least one recipient is required', 'recipients');
    recipients.forEach((id) => validators.objectId(id, 'recipient id'));
    payload.recipients = recipients;
  }
  if (kind === 'event') {
    const startsAt = new Date(req.body.startsAt);
    validators.ensure(!Number.isNaN(startsAt.getTime()), 'A valid event start date is required', 'startsAt');
    payload.startsAt = startsAt;
    if (req.body.endsAt) {
      const endsAt = new Date(req.body.endsAt);
      validators.ensure(!Number.isNaN(endsAt.getTime()) && endsAt >= startsAt, 'Event end must be after its start', 'endsAt');
      payload.endsAt = endsAt;
    }
  }
  const item = await WorkspaceContent.create(payload);
  await writeAuditLog(req, `workspace.${kind}.created`, 'WorkspaceContent', item._id, { title: item.title });
  if (kind !== 'mail') {
    const recipients = await User.find({ deletedAt: null, isActive: true, _id: { $ne: req.user._id } }).distinct('_id');
    await dispatchNotifications({
      recipients,
      title: kind === 'event' ? `Company event: ${item.title}` : `Company announcement: ${item.title}`,
      message: item.body.slice(0, 240),
      type: 'info',
      link: kind === 'event' ? '/events' : '/announcements',
      createdBy: req.user._id,
      sendEmail: true,
      metadata: { workspaceContentId: item._id, kind },
    });
  }
  res.status(201).json(item);
});

const getBirthdays = asyncHandler(async (_req, res) => {
  const users = await User.find({ deletedAt: null, isActive: true, dob: { $ne: null } })
    .select('name dob designation department profileImage')
    .lean();
  const now = new Date();
  const currentMonth = now.getMonth();
  const items = users
    .map((user) => ({ user, dob: new Date(user.dob) }))
    .filter(({ dob }) => !Number.isNaN(dob.getTime()) && dob.getMonth() === currentMonth)
    .map(({ user, dob }) => ({
      ...user,
      nextBirthday: new Date(now.getFullYear(), currentMonth, dob.getDate()),
    }))
    .sort((a, b) => new Date(a.nextBirthday) - new Date(b.nextBirthday));

  res.json(items);
});

const getDocuments = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('documents').lean();
  res.json(user?.documents || []);
});

const getDirectory = asyncHandler(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id }, deletedAt: null, isActive: true })
    .select('name employeeId designation department profileImage')
    .sort({ name: 1 })
    .limit(500)
    .lean();
  res.json(users);
});

module.exports = { getContent, createContent, getBirthdays, getDocuments, getDirectory };
