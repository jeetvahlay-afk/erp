const mongoose = require('mongoose');

const workspaceContentSchema = new mongoose.Schema({
  kind: { type: String, enum: ['mail', 'announcement', 'event'], required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  body: { type: String, required: true, trim: true, maxlength: 5000 },
  recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  startsAt: { type: Date, default: null, index: true },
  endsAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, versionKey: false });

workspaceContentSchema.index({ kind: 1, isActive: 1, createdAt: -1 });
workspaceContentSchema.index({ recipients: 1, kind: 1, createdAt: -1 });

module.exports = mongoose.model('WorkspaceContent', workspaceContentSchema);
