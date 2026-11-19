const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true, index: true },
  loginTime: { type: Date },
  logoutTime: { type: Date },
  status: { type: String, enum: ['Present', 'Absent', 'Late', 'Half Day'], default: 'Present', index: true },
  totalHours: { type: Number, default: 0, min: 0 },
  extendedUntil: { type: Date },
  overtimeExtensions: { type: Number, default: 0 },
  autoPunchedOut: { type: Boolean, default: false },
}, { timestamps: true, optimisticConcurrency: true });

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1, status: 1 });

attendanceSchema.pre('save', function calculateHours() {
  if (this.loginTime && this.logoutTime) {
    this.totalHours = Math.max(0, (this.logoutTime.getTime() - this.loginTime.getTime()) / 3600000);
  }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
