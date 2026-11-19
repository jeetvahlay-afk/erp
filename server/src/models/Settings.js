const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },
  config: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.model('Settings', settingsSchema);
