const mongoose = require('mongoose');

const breakRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, required: true, trim: true, minlength: 3, maxlength: 500 },
  requestedDuration: { type: Number, required: true, min: 1, max: 240 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
  adminComment: { type: String, trim: true, maxlength: 500 },
  isUsed: { type: Boolean, default: false, index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true, optimisticConcurrency: true });

breakRequestSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('BreakRequest', breakRequestSchema);
