const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/, index: true },
  baseSalary: { type: Number, required: true, default: 0, min: 0 },
  allowances: {
    bonus: { type: Number, default: 0, min: 0 },
    housing: { type: Number, default: 0, min: 0 },
    transport: { type: Number, default: 0, min: 0 },
    other: { type: Number, default: 0, min: 0 },
  },
  deductions: {
    tax: { type: Number, default: 0, min: 0 },
    insurance: { type: Number, default: 0, min: 0 },
    unpaidLeave: { type: Number, default: 0, min: 0 },
    securityDeposit: { type: Number, default: 0, min: 0 },
    pf: { type: Number, default: 0, min: 0 },
    other: { type: Number, default: 0, min: 0 },
  },
  netSalary: { type: Number, required: true, min: 0 },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'processing'], default: 'unpaid', index: true },
  paymentDate: { type: Date },
  paymentMethod: { type: String, enum: ['bank_transfer', 'cash', 'check', 'other'], default: 'bank_transfer' },
  referenceNumber: { type: String, trim: true, maxlength: 120 },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, optimisticConcurrency: true });

payrollSchema.index({ user: 1, month: 1 }, { unique: true });
payrollSchema.index({ month: 1, paymentStatus: 1 });

module.exports = mongoose.model('Payroll', payrollSchema);
