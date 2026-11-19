const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
  code: { type: String, unique: true, sparse: true, trim: true, uppercase: true, maxlength: 20 },
  description: { type: String, default: '', trim: true, maxlength: 1000 },
  headName: { type: String, default: '', trim: true, maxlength: 120 },
  location: { type: String, default: '', trim: true, maxlength: 180 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, optimisticConcurrency: true });

departmentSchema.index({ name: 'text', code: 'text' });

module.exports = mongoose.model('Department', departmentSchema);
