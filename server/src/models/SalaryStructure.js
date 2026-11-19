const mongoose = require('mongoose');

const moneyField = { type: Number, default: 0, min: 0 };

const salaryStructureSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  baseSalary: moneyField,
  hra: moneyField,
  transportAllowance: moneyField,
  securityAllowance: moneyField,
  otherAllowances: moneyField,
  pfDeduction: moneyField,
  taxDeduction: moneyField,
  securityDeposit: moneyField,
  otherDeductions: moneyField,
  totalAllowance: moneyField,
  totalDeduction: moneyField,
  netSalary: moneyField,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, optimisticConcurrency: true });

salaryStructureSchema.pre('validate', function calculateTotals() {
  this.totalAllowance = this.hra + this.transportAllowance + this.securityAllowance + this.otherAllowances;
  this.totalDeduction = this.pfDeduction + this.taxDeduction + this.securityDeposit + this.otherDeductions;
  this.netSalary = Math.max(0, this.baseSalary + this.totalAllowance - this.totalDeduction);
});

module.exports = mongoose.model('SalaryStructure', salaryStructureSchema);
