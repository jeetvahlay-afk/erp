const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true, maxlength: 10 },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatConversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, trim: true, maxlength: 4000, default: '' },
  type: { type: String, enum: ['text', 'file', 'image'], default: 'text' },
  fileUrl: { type: String, trim: true, default: '' },
  fileName: { type: String, trim: true, maxlength: 260, default: '' },
  fileMime: { type: String, trim: true, maxlength: 120, default: '' },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage', default: null },
  forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage', default: null },
  reactions: { type: [reactionSchema], default: [] },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

chatMessageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
