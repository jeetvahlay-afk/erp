const mongoose = require('mongoose');

const workReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true, index: true },
  hoursWorked: { type: Number, required: true, min: 0, max: 24 },
  completion: { type: Number, required: true, min: 0, max: 100 },
  accomplishments: { type: String, required: true, trim: true, maxlength: 4000 },
  blockers: { type: String, trim: true, maxlength: 2000, default: '' },
  nextPlan: { type: String, trim: true, maxlength: 2000, default: '' },
}, { timestamps: true, versionKey: false });

workReportSchema.index({ user: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('WorkReport', workReportSchema);
