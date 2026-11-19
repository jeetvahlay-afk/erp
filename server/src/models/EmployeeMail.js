const mongoose = require('mongoose');

const employeeMailSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
  subject: { type: String, required: true, trim: true, maxlength: 180 },
  body: { type: String, required: true, trim: true, maxlength: 10000 },
  status: { type: String, enum: ['draft', 'sent'], default: 'draft', index: true },
  sentAt: { type: Date, default: null, index: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  trashedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true, versionKey: false });

employeeMailSchema.index({ recipients: 1, status: 1, sentAt: -1 });
employeeMailSchema.index({ sender: 1, status: 1, updatedAt: -1 });
module.exports = mongoose.model('EmployeeMail', employeeMailSchema);
