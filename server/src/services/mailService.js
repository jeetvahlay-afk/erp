const nodemailer = require('nodemailer');
const env = require('../config/env');
const Settings = require('../models/Settings');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { transformSensitive } = require('../utils/crypto');

const getConfiguredAccounts = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const isExplicitSecure = process.env.SMTP_SECURE === 'true' || String(process.env.SMTP_SECURE).toLowerCase() === 'true';
    const secure = port === 465 || (isExplicitSecure && port !== 587);

    return [{
      id: 'env-primary',
      accountName: process.env.SMTP_FROM_NAME || 'Vahlay Consulting',
      fromName: process.env.SMTP_FROM_NAME || 'Vahlay Consulting',
      smtpHost: process.env.SMTP_HOST,
      smtpPort: port,
      secure,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
    }];
  }

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

const createTransport = (account) => {
  const port = Number(account.smtpPort) || 587;
  // Port 587 uses STARTTLS (secure: false). Port 465 uses SSL/TLS (secure: true).
  const isExplicitSecure = account.secure === true || String(account.secure).toLowerCase() === 'true';
  const isSecure = port === 465 || (isExplicitSecure && port !== 587);

  return nodemailer.createTransport({
    host: account.smtpHost,
    port,
    secure: isSecure,
    auth: {
      user: account.smtpUser,
      pass: account.smtpPass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
};

const sendSystemEmail = async ({ to, subject, text, html, accountId }) => {
  const accounts = await getConfiguredAccounts();
  const account = selectAccount(accounts, accountId);
  const transport = createTransport(account);
  const fromName = String(account.fromName || account.accountName || 'Vahlay Consulting').replace(/[\r\n"]/g, '').trim();
  try {
    const result = await transport.sendMail({
      from: `"${fromName}" <${account.smtpUser}>`,
      replyTo: account.smtpUser,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });
    return { messageId: result.messageId, accepted: result.accepted, rejected: result.rejected };
  } finally {
    transport.close();
  }
};

const { addEmailJob } = require('../queues/emailQueue');

const sendNotificationEmails = async ({ recipients, title, message, link }) => {
  try {
    const ids = [...new Set((Array.isArray(recipients) ? recipients : [recipients]).filter(Boolean).map(String))];
    if (ids.length === 0) return;
    const users = await User.find({ _id: { $in: ids }, isActive: true, deletedAt: null }).select('email').lean();
    const destination = link ? new URL(link, env.appBaseUrl).toString() : '';
    const suffix = destination ? `\n\nOpen TeamHub ERP to review: ${destination}` : '';

    for (const user of users.slice(0, 250)) {
      if (!user.email) continue;
      const emailPayload = {
        to: user.email,
        subject: `[TeamHub ERP] ${title}`,
        text: `${message}${suffix}`,
      };

      // Enqueue to BullMQ worker queue with retry & concurrency control
      const job = await addEmailJob('send-system-email', emailPayload, {
        jobId: `notif-${user._id}-${Date.now()}`,
      });

      // If BullMQ is offline or returns null, deliver directly via fallback
      if (!job) {
        try {
          await sendSystemEmail(emailPayload);
        } catch (error) {
          logger.error('Notification direct email delivery failed', { recipientUserId: user._id, error: error.message });
        }
      }
    }
  } catch (error) {
    logger.error('Unable to prepare notification emails', { error: error.message });
  }
};

module.exports = { createTransport, getConfiguredAccounts, sendSystemEmail, sendNotificationEmails };
