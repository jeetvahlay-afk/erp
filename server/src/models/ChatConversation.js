const mongoose = require('mongoose');

const chatConversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['direct', 'team'], required: true, index: true },
  name: { type: String, trim: true, maxlength: 120, default: '' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  directKey: { type: String, unique: true, sparse: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastMessageAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true, versionKey: false });

chatConversationSchema.index({ members: 1, lastMessageAt: -1 });

module.exports = mongoose.model('ChatConversation', chatConversationSchema);
