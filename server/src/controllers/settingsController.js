const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { transformSensitive } = require('../utils/crypto');
const { writeAuditLog } = require('../services/auditService');
const { sendSystemEmail } = require('../services/mailService');

const publicConfig = (settings) => transformSensitive(settings?.config || {}, 'mask');

const getAllSettings = asyncHandler(async (_req, res) => {
  const settings = await Settings.find({}).sort({ type: 1 }).lean();
  res.json(settings.map((item) => ({ ...item, config: publicConfig(item) })));
});

const getSettings = asyncHandler(async (req, res) => {
  const type = validators.requiredString(req.params.type, 'type', { max: 80 }).toLowerCase();
  const settings = await Settings.findOne({ type }).lean();
  res.json(settings ? publicConfig(settings) : (type === 'breaks' || type === 'shifts' || type === 'mail' ? [] : {}));
});

const updateSettings = asyncHandler(async (req, res) => {
  const type = validators.requiredString(req.params.type, 'type', { max: 80 }).toLowerCase();
  if (!req.body || typeof req.body !== 'object') throw new AppError('Configuration payload must be an object or array', 400, 'INVALID_CONFIG');
  const existing = await Settings.findOne({ type });
  const encryptedConfig = transformSensitive(req.body, 'encrypt', existing?.config);

  const settings = await Settings.findOneAndUpdate(
    { type },
    { $set: { config: encryptedConfig, updatedBy: req.user._id } },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await writeAuditLog(req, 'settings.updated', 'Settings', settings._id, { type });
  res.json({ message: 'Settings updated successfully', config: publicConfig(settings) });
});


const testMailSettings = asyncHandler(async (req, res) => {
  const recipient = validators.email(req.body.recipient || req.user.email);
  const accountId = validators.optionalString(req.body.accountId, 'accountId', { max: 120 });
  const result = await sendSystemEmail({
    to: recipient,
    accountId,
    subject: '[TeamHub ERP] SMTP configuration test',
    text: `This test confirms that TeamHub ERP can send email through the selected SMTP account.

Requested by: ${req.user.name} (${req.user.email})`,
  });
  await writeAuditLog(req, 'settings.mail_tested', 'Settings', undefined, { recipient, accountId });
  res.json({ message: `Test email accepted for delivery to ${recipient}`, accepted: result.accepted });
});

module.exports = { getSettings, getAllSettings, updateSettings, testMailSettings };
