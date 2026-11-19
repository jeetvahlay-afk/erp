const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  permissions: { type: [String], default: [] },
  allowedRoutes: { type: [String], default: [] },
  isSystem: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, optimisticConcurrency: true });

roleSchema.index({ name: 1, isActive: 1 });

module.exports = mongoose.model('Role', roleSchema);
