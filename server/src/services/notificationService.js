const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendNotificationEmails } = require('./mailService');
const { publish } = require('./realtimeService');

const normalizeRecipients = (recipients) => [...new Set(
  (Array.isArray(recipients) ? recipients : [recipients])
    .filter(Boolean)
    .map(String),
)];

const createNotifications = async ({
  recipients,
  title,
  message,
  type = 'info',
  link = '',
  createdBy,
  metadata,
  expiresAt,
}) => {
  const uniqueRecipients = normalizeRecipients(recipients);
  if (uniqueRecipients.length === 0) return [];

  const records = await Notification.insertMany(uniqueRecipients.map((recipient) => ({
    recipient,
    title,
    message,
    type,
    link,
    createdBy: createdBy || null,
    metadata,
    expiresAt: expiresAt || null,
  })), { ordered: false });
  records.forEach((record) => publish(record.recipient, 'notification', record));
  return records;
};

const notifyActiveRoles = async (roles, notification) => {
  const recipients = await User.find({
    role: { $in: roles.map((role) => String(role).toLowerCase()) },
    isActive: true,
    deletedAt: null,
  }).distinct('_id');
  return createNotifications({ ...notification, recipients });
};

const dispatchNotifications = async (notification) => {
  try {
    const records = await createNotifications(notification);
    if (notification.sendEmail) {
      setImmediate(() => {
        sendNotificationEmails(notification).catch((err) => {
          logger.error('Background notification email delivery failed', { error: err.message });
        });
      });
    }
    return records;
  } catch (error) {
    logger.error('Unable to create in-app notification', { error: error.message });
    return [];
  }
};

const dispatchToActiveRoles = async (roles, notification) => {
  try {
    const recipients = await User.find({
      role: { $in: roles.map((role) => String(role).toLowerCase()) },
      isActive: true,
      deletedAt: null,
    }).distinct('_id');
    const records = await createNotifications({ ...notification, recipients });
    if (notification.sendEmail) {
      setImmediate(() => {
        sendNotificationEmails({ ...notification, recipients }).catch((err) => {
          logger.error('Background role notification email delivery failed', { error: err.message });
        });
      });
    }
    return records;
  } catch (error) {
    logger.error('Unable to create role notification', { roles, error: error.message });
    return [];
  }
};

module.exports = {
  createNotifications,
  notifyActiveRoles,
  dispatchNotifications,
  dispatchToActiveRoles,
};
