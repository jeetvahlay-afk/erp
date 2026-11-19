const EmployeeMail = require('../models/EmployeeMail');
const EmployeeMailConfig = require('../models/EmployeeMailConfig');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { dispatchNotifications } = require('../services/notificationService');
const { createTransport } = require('../services/mailService');
const { MASK, transformSensitive } = require('../utils/crypto');

const publicMailConfig = (config) => transformSensitive(config || {}, 'mask');

const listMail = asyncHandler(async (req, res) => {
  const folder = validators.enumValue(req.query.folder || 'inbox', ['inbox', 'sent', 'draft', 'starred', 'archive', 'trash'], 'folder');
  const userId = req.user._id;
  let query;
  if (folder === 'draft') query = { sender: userId, status: 'draft' };
  else if (folder === 'sent') query = { sender: userId, status: 'sent', trashedBy: { $ne: userId }, deletedBy: { $ne: userId } };
  else if (folder === 'starred') query = { $or: [{ sender: userId }, { recipients: userId }], starredBy: userId, trashedBy: { $ne: userId }, deletedBy: { $ne: userId } };
  else if (folder === 'archive') query = { $or: [{ sender: userId }, { recipients: userId }], archivedBy: userId, trashedBy: { $ne: userId }, deletedBy: { $ne: userId } };
  else if (folder === 'trash') query = { $or: [{ sender: userId }, { recipients: userId }], trashedBy: userId, deletedBy: { $ne: userId } };
  else query = { recipients: userId, status: 'sent', archivedBy: { $ne: userId }, trashedBy: { $ne: userId }, deletedBy: { $ne: userId } };
  if (req.query.search) {
    const search = String(req.query.search).trim().slice(0, 120).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (search) query.$and = [{ $or: [{ subject: new RegExp(search, 'i') }, { body: new RegExp(search, 'i') }] }];
  }
  const items = await EmployeeMail.find(query).populate('sender recipients', 'name email profileImage').sort(folder === 'draft' ? { updatedAt: -1 } : { sentAt: -1 }).lean();
  res.json(items);
});

const saveMail = asyncHandler(async (req, res) => {
  const status = validators.enumValue(req.body.status || 'sent', ['draft', 'sent'], 'status');
  const recipientEmails = Array.isArray(req.body.recipientEmails)
    ? req.body.recipientEmails
    : String(req.body.recipientEmails || '').split(',');
  const normalizedEmails = [...new Set(recipientEmails.map((email) => String(email).trim().toLowerCase()).filter(Boolean))];
  const emailRecipients = normalizedEmails.length
    ? await User.find({ email: { $in: normalizedEmails }, deletedAt: null, isActive: true }).select('_id email').lean()
    : [];
  if (normalizedEmails.length) validators.ensure(emailRecipients.length === normalizedEmails.length, 'Every recipient must be an active employee email', 'recipientEmails');
  const recipientIds = Array.isArray(req.body.recipients) ? [...new Set(req.body.recipients.map(String))] : emailRecipients.map((user) => String(user._id));
  recipientIds.forEach((id) => validators.objectId(id, 'recipient id'));
  if (status === 'sent') validators.ensure(recipientIds.length > 0, 'Select at least one recipient', 'recipients');
  const validRecipients = await User.find({ _id: { $in: recipientIds }, deletedAt: null, isActive: true }).distinct('_id');
  const payload = { sender: req.user._id, recipients: validRecipients, subject: validators.requiredString(req.body.subject, 'subject', { max: 180 }), body: validators.requiredString(req.body.body, 'body', { max: 10000 }), status, sentAt: status === 'sent' ? new Date() : null };
  if (status === 'sent') {
    const config = await EmployeeMailConfig.findOne({ user: req.user._id }).lean();
    if (!config?.smtpHost || !config?.smtpPort || !config?.smtpUser || !config?.smtpPassword) throw new AppError('Your SMTP account is not configured. Ask an administrator to configure it in Mail Configuration.', 409, 'MAIL_NOT_CONFIGURED');
    const credentials = transformSensitive(config, 'decrypt');
    const recipients = await User.find({ _id: { $in: validRecipients } }).select('email').lean();
    const transport = createTransport({ ...credentials, smtpPass: credentials.smtpPassword, secure: credentials.smtpSecure });
    try {
      await transport.sendMail({ from: `"${String(credentials.displayName || req.user.name).replace(/[\r\n"]/g, '')}" <${credentials.smtpUser}>`, to: recipients.map((recipient) => recipient.email), subject: payload.subject, text: payload.body });
    } finally {
      transport.close();
    }
  }
  let mail;
  if (req.body.id) {
    validators.objectId(req.body.id, 'mail id');
    mail = await EmployeeMail.findOneAndUpdate({ _id: req.body.id, sender: req.user._id, status: 'draft' }, { $set: payload }, { returnDocument: 'after', runValidators: true });
    if (!mail) throw new AppError('Draft not found', 404, 'MAIL_NOT_FOUND');
  } else mail = await EmployeeMail.create(payload);
  if (status === 'sent') await dispatchNotifications({
    recipients: validRecipients,
    title: `Email from ${req.user.name}`,
    message: payload.subject,
    type: 'info',
    link: '/mail/inbox',
    createdBy: req.user._id,
    metadata: { employeeMailId: mail._id, deliveryStatus: 'delivered' },
  });
  res.status(201).json(await EmployeeMail.findById(mail._id).populate('sender recipients', 'name email profileImage'));
});

const getMailConfig = asyncHandler(async (req, res) => {
  const config = await EmployeeMailConfig.findOne({ user: req.user._id }).lean();
  res.json(config ? publicMailConfig(config) : { user: req.user._id, displayName: req.user.name, signature: '', accountId: req.user.email });
});

const updateMyMailConfig = asyncHandler(async (req, res) => {
  const config = await EmployeeMailConfig.findOneAndUpdate(
    { user: req.user._id },
    { $set: { displayName: validators.optionalString(req.body.displayName, 'displayName', { max: 120 }) || '', signature: validators.optionalString(req.body.signature, 'signature', { max: 2000 }) || '', updatedBy: req.user._id } },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  res.json(config);
});

const updateEmployeeMailConfig = asyncHandler(async (req, res) => {
  validators.objectId(req.params.userId, 'user id');
  const user = await User.findOne({ _id: req.params.userId, deletedAt: null });
  if (!user) throw new AppError('Employee not found', 404, 'USER_NOT_FOUND');
  const update = { updatedBy: req.user._id };
  update.smtpProvider = validators.enumValue(req.body.smtpProvider || 'custom', ['hostinger', 'google', 'custom'], 'SMTP provider');
  update.smtpHost = validators.requiredString(req.body.smtpHost, 'SMTP host', { max: 254 });
  update.smtpPort = validators.number(req.body.smtpPort, 'SMTP port', { min: 1, max: 65535 });
  update.smtpSecure = Boolean(req.body.smtpSecure);
  update.smtpUser = validators.email(req.body.smtpUser);
  if (req.body.smtpPassword !== undefined && req.body.smtpPassword !== MASK) {
    update.smtpPassword = transformSensitive({ smtpPassword: validators.requiredString(req.body.smtpPassword, 'SMTP password', { max: 256 }) }, 'encrypt').smtpPassword;
  }
  const config = await EmployeeMailConfig.findOneAndUpdate({ user: user._id }, { $set: update }, { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true });
  res.json(publicMailConfig(config.toObject()));
});

const listEmployeeMailConfigs = asyncHandler(async (_req, res) => {
  const [users, configs] = await Promise.all([
    User.find({ deletedAt: null, isActive: true }).select('name email employeeId department designation profileImage').sort({ name: 1 }).lean(),
    EmployeeMailConfig.find().lean(),
  ]);
  const byUser = new Map(configs.map((config) => [String(config.user), config]));
  res.json(users.map((user) => ({ ...user, mailConfig: publicMailConfig(byUser.get(String(user._id)) || {}) })));
});

const testEmployeeMailConfig = asyncHandler(async (req, res) => {
  validators.objectId(req.params.userId, 'user id');
  const config = await EmployeeMailConfig.findOne({ user: req.params.userId }).lean();
  if (!config?.smtpHost || !config?.smtpPort || !config?.smtpUser || !config?.smtpPassword) throw new AppError('Configure this employee’s SMTP account first', 409, 'MAIL_NOT_CONFIGURED');
  const credentials = transformSensitive(config, 'decrypt');
  const transport = createTransport({ ...credentials, smtpPass: credentials.smtpPassword, secure: credentials.smtpSecure });
  try {
    await transport.sendMail({ from: credentials.smtpUser, to: credentials.smtpUser, subject: '[TeamHub ERP] SMTP account test', text: 'Your employee email account is configured correctly.' });
  } finally {
    transport.close();
  }
  res.json({ message: `Test email sent to ${credentials.smtpUser}` });
});

const updateMailAction = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'mail id');
  const action = validators.enumValue(req.body.action, ['read', 'unread', 'star', 'unstar', 'archive', 'restore', 'trash', 'delete'], 'action');
  const mail = await EmployeeMail.findOne({ _id: req.params.id, $or: [{ sender: req.user._id }, { recipients: req.user._id }] });
  if (!mail) throw new AppError('Mail not found', 404, 'MAIL_NOT_FOUND');
  const add = (field) => { if (!mail[field].some((id) => id.equals(req.user._id))) mail[field].push(req.user._id); };
  const remove = (field) => { mail[field] = mail[field].filter((id) => !id.equals(req.user._id)); };
  if (action === 'read') add('readBy');
  if (action === 'unread') remove('readBy');
  if (action === 'star') add('starredBy');
  if (action === 'unstar') remove('starredBy');
  if (action === 'archive') { add('archivedBy'); remove('trashedBy'); }
  if (action === 'restore') { remove('archivedBy'); remove('trashedBy'); }
  if (action === 'trash') { add('trashedBy'); remove('archivedBy'); }
  if (action === 'delete') {
    validators.ensure(mail.trashedBy.some((id) => id.equals(req.user._id)), 'Move mail to trash before deleting it', 'action');
    add('deletedBy');
  }
  await mail.save();
  res.json({ message: 'Mail updated successfully' });
});

module.exports = { listMail, saveMail, getMailConfig, updateMyMailConfig, updateEmployeeMailConfig, listEmployeeMailConfigs, testEmployeeMailConfig, updateMailAction };
