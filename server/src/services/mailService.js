const nodemailer = require('nodemailer');
const env = require('../config/env');
const Settings = require('../models/Settings');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { transformSensitive } = require('../utils/crypto');

const getConfiguredAccounts = async () => {
  const settings = await Settings.findOne({ type: 'mail' }).lean();
  const config = transformSensitive(settings?.config || [], 'decrypt');
  const accounts = Array.isArray(config) ? config : (config && Object.keys(config).length ? [config] : []);
  return accounts.filter((account) => account?.smtpHost && account?.smtpPort && account?.smtpUser && account?.smtpPass);
};

const selectAccount = (accounts, accountId) => {
  const account = accountId ? accounts.find((item) => String(item.id) === String(accountId)) : accounts[0];
  if (!account) throw new AppError('No usable SMTP account is configured', 409, 'MAIL_NOT_CONFIGURED');
  return account;
};

const createTransport = (account) => nodemailer.createTransport({
  host: account.smtpHost,
  port: Number(account.smtpPort),
  secure: account.secure === true || String(account.secure) === 'true' || Number(account.smtpPort) === 465,
  auth: {
    user: account.smtpUser,
    pass: account.smtpPass,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

const sendSystemEmail = async ({ to, subject, text, accountId }) => {
  const accounts = await getConfiguredAccounts();
  const account = selectAccount(accounts, accountId);
  const transport = createTransport(account);
  const fromName = String(account.fromName || account.accountName || 'TeamHub ERP').replace(/[\r\n"]/g, '').trim();
  try {
    const result = await transport.sendMail({
      from: `"${fromName}" <${account.smtpUser}>`,
      to,
      subject,
      text,
    });
    return { messageId: result.messageId, accepted: result.accepted, rejected: result.rejected };
  } finally {
    transport.close();
  }
};

const sendNotificationEmails = async ({ recipients, title, message, link }) => {
  try {
    const ids = [...new Set((Array.isArray(recipients) ? recipients : [recipients]).filter(Boolean).map(String))];
    if (ids.length === 0) return;
    const users = await User.find({ _id: { $in: ids }, isActive: true, deletedAt: null }).select('email').lean();
    const destination = link ? new URL(link, env.appBaseUrl).toString() : '';
    const suffix = destination ? `\n\nOpen TeamHub ERP to review: ${destination}` : '';

    // Sequential delivery avoids unbounded SMTP connections during large workflows.
    for (const user of users.slice(0, 250)) {
      try {
        await sendSystemEmail({ to: user.email, subject: `[TeamHub ERP] ${title}`, text: `${message}${suffix}` });
      } catch (error) {
        logger.error('Notification email delivery failed', { recipientUserId: user._id, error: error.message });
      }
    }
  } catch (error) {
    logger.error('Unable to prepare notification emails', { error: error.message });
  }
};

module.exports = { createTransport, getConfiguredAccounts, sendSystemEmail, sendNotificationEmails };
