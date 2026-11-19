const mongoose = require('mongoose');

const employeeMailConfigSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  displayName: { type: String, trim: true, maxlength: 120, default: '' },
  signature: { type: String, trim: true, maxlength: 2000, default: '' },
  accountId: { type: String, trim: true, maxlength: 120, default: '' },
  smtpProvider: { type: String, enum: ['hostinger', 'google', 'custom'], default: 'hostinger' },
  smtpHost: { type: String, trim: true, maxlength: 254, default: '' },
  smtpPort: { type: Number, min: 1, max: 65535, default: 465 },
  smtpSecure: { type: Boolean, default: true },
  smtpUser: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  smtpPassword: { type: String, maxlength: 512, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('EmployeeMailConfig', employeeMailConfigSchema);
