const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'in progress', 'completed'], default: 'pending', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium', index: true },
  dueDate: { type: Date, default: null, index: true },
  completedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

taskSchema.index({ assignee: 1, status: 1, dueDate: 1 });
module.exports = mongoose.model('Task', taskSchema);
