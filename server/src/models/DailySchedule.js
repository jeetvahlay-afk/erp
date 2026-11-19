const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  breakType: { type: String, required: true, trim: true, maxlength: 120 },
  fromTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  toTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
}, { _id: false });

const dailyScheduleSchema = new mongoose.Schema({
  dateText: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  breaks: { type: [breakSchema], default: [] },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.model('DailySchedule', dailyScheduleSchema);
