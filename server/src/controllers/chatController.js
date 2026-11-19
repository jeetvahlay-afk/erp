const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { isImage } = require('../middleware/chatUploadMiddleware');
const { dispatchNotifications } = require('../services/notificationService');
const { publish } = require('../services/realtimeService');

const SENDER_FIELDS = 'name profileImage';
const REPLY_FIELDS = 'sender body type fileName deletedAt';

const populateConversation = (query) => query
  .populate('members', 'name employeeId designation department profileImage')
  .populate('createdBy', 'name profileImage');

const populateMessage = (query) => query
  .populate('sender', SENDER_FIELDS)
  .populate({ path: 'replyTo', select: REPLY_FIELDS, populate: { path: 'sender', select: SENDER_FIELDS } })
  .populate({ path: 'forwardedFrom', select: REPLY_FIELDS, populate: { path: 'sender', select: SENDER_FIELDS } });

const listConversations = asyncHandler(async (req, res) => {
  const query = { members: req.user._id };
  if (req.query.type) query.type = validators.enumValue(req.query.type, ['direct', 'team'], 'type');
  const items = await populateConversation(ChatConversation.find(query).sort({ lastMessageAt: -1 })).lean();
  res.json(items);
});

const createConversation = asyncHandler(async (req, res) => {
  const type = validators.enumValue(req.body.type, ['direct', 'team'], 'type');
  const memberIds = Array.isArray(req.body.memberIds) ? [...new Set(req.body.memberIds.map(String))] : [];
  memberIds.forEach((id) => validators.objectId(id, 'member id'));
  const validMembers = await User.find({ _id: { $in: memberIds }, deletedAt: null, isActive: true }).distinct('_id');
  const members = [...new Set([req.user._id.toString(), ...validMembers.map(String)])];
  validators.ensure(members.length >= 2, 'Select at least one other team member', 'memberIds');

  if (type === 'direct') {
    validators.ensure(members.length === 2, 'Direct chat requires exactly one other member', 'memberIds');
    const directKey = [...members].sort().join(':');
    let conversation = await ChatConversation.findOne({ directKey });
    if (!conversation) conversation = await ChatConversation.create({ type, members, directKey, createdBy: req.user._id });
    conversation = await populateConversation(ChatConversation.findById(conversation._id));
    return res.status(201).json(conversation);
  }

  const name = validators.requiredString(req.body.name, 'name', { max: 120 });
  let conversation = await ChatConversation.create({ type, name, members, admins: [req.user._id], createdBy: req.user._id });
  conversation = await populateConversation(ChatConversation.findById(conversation._id));
  return res.status(201).json(conversation);
});

const requireMembership = async (conversationId, userId) => {
  validators.objectId(conversationId, 'conversation id');
  const conversation = await ChatConversation.findOne({ _id: conversationId, members: userId });
  if (!conversation) throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  return conversation;
};

const listMessages = asyncHandler(async (req, res) => {
  await requireMembership(req.params.id, req.user._id);
  const items = await populateMessage(
    ChatMessage.find({ conversation: req.params.id })
      .sort({ createdAt: 1 })
      .limit(500),
  ).lean();
  res.json(items);
});

const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await requireMembership(req.params.id, req.user._id);

  let messageType = 'text';
  let fileUrl = '';
  let fileName = '';
  let fileMime = '';
  let body = '';

  if (req.file) {
    fileMime = req.file.mimetype;
    fileName = req.file.originalname || req.file.filename;
    fileUrl = `/uploads/chat/${req.file.filename}`;
    messageType = isImage(fileMime) ? 'image' : 'file';
    body = req.body.body ? String(req.body.body).trim() : '';
  } else {
    body = validators.requiredString(req.body.body, 'body', { max: 4000 });
  }

  const replyTo = req.body.replyTo || null;
  if (replyTo) validators.objectId(replyTo, 'replyTo');

  const forwardedFrom = req.body.forwardedFrom || null;
  if (forwardedFrom) validators.objectId(forwardedFrom, 'forwardedFrom');

  let message = await ChatMessage.create({
    conversation: conversation._id,
    sender: req.user._id,
    body,
    type: messageType,
    fileUrl,
    fileName,
    fileMime,
    replyTo: replyTo || undefined,
    forwardedFrom: forwardedFrom || undefined,
  });

  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  message = await populateMessage(ChatMessage.findById(message._id));
  const recipients = conversation.members.filter((id) => String(id) !== String(req.user._id));
  publish(conversation.members, 'chat.message', { conversationId: conversation._id, message });
  await dispatchNotifications({
    recipients,
    title: conversation.type === 'team' ? `${conversation.name}: new message` : `New message from ${req.user.name}`,
    message: body || fileName || 'Attachment',
    type: 'info',
    link: conversation.type === 'team' ? '/team-chat' : '/direct-chat',
    createdBy: req.user._id,
    metadata: { conversationId: conversation._id, messageId: message._id },
  });
  res.status(201).json(message);
});

const deleteMessage = asyncHandler(async (req, res) => {
  validators.objectId(req.params.msgId, 'message id');
  await requireMembership(req.params.id, req.user._id);

  const message = await ChatMessage.findById(req.params.msgId);
  if (!message) throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');

  const isOwner = message.sender.toString() === req.user._id.toString();
  const isAdmin = ['admin', 'super admin'].includes(String(req.user.role || '').toLowerCase());
  if (!isOwner && !isAdmin) throw new AppError('You can only delete your own messages', 403, 'FORBIDDEN');

  message.deletedAt = new Date();
  await message.save();

  res.json({ _id: message._id, deletedAt: message.deletedAt });
});

const reactToMessage = asyncHandler(async (req, res) => {
  validators.objectId(req.params.msgId, 'message id');
  await requireMembership(req.params.id, req.user._id);

  const emoji = String(req.body.emoji || '').trim();
  if (!emoji) throw new AppError('Emoji is required', 400, 'VALIDATION_ERROR');

  const message = await ChatMessage.findById(req.params.msgId);
  if (!message) throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');

  const userId = req.user._id.toString();
  const existing = message.reactions.find((r) => r.emoji === emoji);

  if (existing) {
    const idx = existing.users.map(String).indexOf(userId);
    if (idx >= 0) {
      // Toggle off
      existing.users.splice(idx, 1);
      if (existing.users.length === 0) {
        message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      existing.users.push(req.user._id);
    }
  } else {
    message.reactions.push({ emoji, users: [req.user._id] });
  }

  await message.save();

  const updated = await populateMessage(ChatMessage.findById(message._id));
  const conversation = await ChatConversation.findById(req.params.id).select('members type name');
  publish(conversation.members, 'chat.reaction', { conversationId: conversation._id, message: updated });
  if (String(message.sender) !== String(req.user._id)) await dispatchNotifications({
    recipients: message.sender,
    title: `${req.user.name} reacted ${emoji}`,
    message: bodyPreview(message.body),
    type: 'info',
    link: conversation.type === 'team' ? '/team-chat' : '/direct-chat',
    createdBy: req.user._id,
    metadata: { conversationId: conversation._id, messageId: message._id },
  });
  res.json(updated);
});

const bodyPreview = (body) => String(body || 'your message').slice(0, 160);

module.exports = { listConversations, createConversation, listMessages, sendMessage, deleteMessage, reactToMessage };
