const mongoose = require('mongoose');
const { PROFILE_EDITABLE_FIELDS } = require('../constants/security');

const profileRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  field: { type: String, required: true, enum: PROFILE_EDITABLE_FIELDS },
  newValue: { type: String, required: true, trim: true, maxlength: 1000 },
  oldValue: { type: String, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  adminComment: { type: String, trim: true, maxlength: 1000 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true, optimisticConcurrency: true });

profileRequestSchema.index({ user: 1, field: 1, status: 1 });
profileRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ProfileRequest', profileRequestSchema);
