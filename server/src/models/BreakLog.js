const mongoose = require('mongoose');

const breakLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  breakType: { type: String, required: true, trim: true, maxlength: 120 },
  startTime: { type: Date, required: true, default: Date.now, index: true },
  endTime: { type: Date },
  allottedDuration: { type: Number, required: true, min: 1, max: 240 },
  actualDuration: { type: Number, default: 0, min: 0 },
  isExceeded: { type: Boolean, default: false, index: true },
  exceededDuration: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['Ongoing', 'Completed'], default: 'Ongoing', index: true },
  sourceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'BreakRequest' },
}, { timestamps: true, optimisticConcurrency: true });

breakLogSchema.index({ user: 1, status: 1 });
breakLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('BreakLog', breakLogSchema);
