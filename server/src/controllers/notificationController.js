const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { subscribe } = require('../services/realtimeService');
const { dispatchNotifications } = require('../services/notificationService');
const { checkTrainingDay8Milestones, checkProbation3MonthMilestones } = require('../services/trainingMilestoneService');
const User = require('../models/User');

const streamNotifications = asyncHandler(async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('event: ready\ndata: {}\n\n');
  const unsubscribe = subscribe(req.user._id, res);

  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
  };

  const heartbeat = setInterval(() => {
    try {
      if (!res.destroyed && !res.writableEnded) {
        res.write(': heartbeat\n\n');
      } else {
        cleanup();
      }
    } catch {
      cleanup();
    }
  }, 25000);

  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);

  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const alreadySent = await Notification.exists({ recipient: req.user._id, 'metadata.category': 'birthday', 'metadata.day': dayKey });
  if (!alreadySent) {
    const users = await User.find({ deletedAt: null, isActive: true, dob: { $ne: null } }).select('name dob').lean();
    const names = users.filter((user) => { const dob = new Date(user.dob); return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate(); }).map((user) => user.name);
    if (names.length) await dispatchNotifications({ recipients: req.user._id, title: 'Employee birthdays today', message: names.join(', '), type: 'info', link: '/birthdays', metadata: { category: 'birthday', day: dayKey } });
  }

  // Check 8-day training milestones and 3-month probation milestones
  await checkTrainingDay8Milestones();
  await checkProbation3MonthMilestones();
});

const getMyNotifications = asyncHandler(async (req, res) => {
  // If recipient is HR or Admin, ensure any training & probation milestones are triggered
  if (['admin', 'super admin', 'hr'].includes(req.user?.role?.toLowerCase())) {
    await checkTrainingDay8Milestones();
    await checkProbation3MonthMilestones();
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const query = { recipient: req.user._id };
  if (req.query.unreadOnly === 'true') query.readAt = null;

  const [items, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('title message type link readAt createdAt metadata')
      .lean(),
    Notification.countDocuments({ recipient: req.user._id, readAt: null }),
  ]);

  res.json({ items, unreadCount });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'notification id');
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { $set: { readAt: new Date() } },
    { returnDocument: 'after' },
  ).select('title message type link readAt createdAt metadata');
  if (!notification) throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  res.json(notification);
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, readAt: null },
    { $set: { readAt: new Date() } },
  );
  res.json({ message: 'All notifications marked as read', updatedCount: result.modifiedCount });
});

const deleteNotification = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'notification id');
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  if (!notification) throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  res.status(204).send();
});

module.exports = {
  streamNotifications,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};
