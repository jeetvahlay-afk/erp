const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true, index: true },
  loginTime: { type: Date },
  logoutTime: { type: Date },
  status: { type: String, enum: ['Present', 'Absent', 'Late', 'Half Day'], default: 'Present', index: true },
  totalHours: { type: Number, default: 0, min: 0 },
  grossHours: { type: Number, default: 0, min: 0 },
  isLateCheckIn: { type: Boolean, default: false, index: true },
  lateMinutes: { type: Number, default: 0 },
  isLatePenalty: { type: Boolean, default: false, index: true },
  penaltyDeductionHours: { type: Number, default: 0 },
  lateCountInMonth: { type: Number, default: 0 },
  extendedUntil: { type: Date },
  overtimeExtensions: { type: Number, default: 0 },
  autoPunchedOut: { type: Boolean, default: false },
}, { timestamps: true, optimisticConcurrency: true });

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1, status: 1 });
attendanceSchema.index({ user: 1, date: -1, isLateCheckIn: 1 });

attendanceSchema.pre('validate', function calculateHours() {
  if (this.loginTime && this.logoutTime) {
    if (this.grossHours === undefined || this.grossHours === 0) {
      this.grossHours = Math.max(0, (this.logoutTime.getTime() - this.loginTime.getTime()) / 3600000);
    }
    const penalty = this.isLatePenalty ? (this.penaltyDeductionHours || 4.5) : 0;
    this.totalHours = Math.max(0, this.grossHours - penalty);

    if (this.isLatePenalty) {
      this.status = 'Half Day';
    } else if (this.totalHours < 7) {
      this.status = 'Half Day';
    } else if (this.isLateCheckIn) {
      this.status = 'Late';
    } else {
      this.status = 'Present';
    }
  }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
