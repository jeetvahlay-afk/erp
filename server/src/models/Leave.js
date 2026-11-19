const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  leaveType: { type: String, required: true, enum: ['Sick Leave', 'Casual Leave', 'Paid Leave', 'Unpaid Leave', 'Birthday Leave'], index: true },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  reason: { type: String, required: true, trim: true, minlength: 3, maxlength: 1000 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
  adminResponse: { type: String, trim: true, maxlength: 1000 },
  attachment: { type: String, trim: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true, optimisticConcurrency: true });

leaveSchema.index({ user: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1, createdAt: -1 });

leaveSchema.pre('validate', function validateDateRange() {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be on or after start date');
  }
});

module.exports = mongoose.model('Leave', leaveSchema);
