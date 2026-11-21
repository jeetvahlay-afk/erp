const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const Counter = require('./Counter');

const documentSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 180 },
  filename: { type: String, trim: true, maxlength: 180 },
  size: { type: String, trim: true, maxlength: 40 },
  type: { type: String, trim: true, maxlength: 120 },
  date: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  firstName: { type: String, trim: true, maxlength: 60 },
  lastName: { type: String, trim: true, maxlength: 60 },
  username: { type: String, trim: true, lowercase: true, unique: true, sparse: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, default: 'user', lowercase: true, trim: true, index: true },
  employeeId: { type: String, unique: true, sparse: true, trim: true, index: true },
  allowedRoutes: { type: [String], default: [] },
  permissions: { type: [String], default: [] },
  isActive: { type: Boolean, default: true, index: true },
  deletedAt: { type: Date, default: null, index: true },
  baseSalary: { type: Number, default: 0, min: 0 },
  phone: { type: String, trim: true, maxlength: 30 },
  emergencyName: { type: String, trim: true, maxlength: 120 },
  emergencyPhone: { type: String, trim: true, maxlength: 30 },
  currentAddress: { type: String, trim: true, maxlength: 500 },
  permanentAddress: { type: String, trim: true, maxlength: 500 },
  dob: { type: Date },
  gender: { type: String, trim: true, maxlength: 30 },
  bloodGroup: { type: String, trim: true, maxlength: 10 },
  department: { type: String, trim: true, maxlength: 120, index: true },
  designation: { type: String, trim: true, maxlength: 120, index: true },
  joiningDate: { type: Date, index: true },
  employmentType: { type: String, enum: ['Full Time', 'Part Time', 'Contract', 'Probation', 'Intern'], default: 'Full Time', index: true },
  company: { type: String, trim: true, maxlength: 120 },
  profileImage: { type: String, trim: true, maxlength: 500 },
  bio: { type: String, trim: true, maxlength: 2000 },
  reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bankInformation: { type: mongoose.Schema.Types.Mixed, default: {} },
  familyInformation: { type: [mongoose.Schema.Types.Mixed], default: [] },
  education: { type: [mongoose.Schema.Types.Mixed], default: [] },
  experience: { type: [mongoose.Schema.Types.Mixed], default: [] },
  documents: { type: [documentSchema], default: [] },
  shift: { type: String, default: '', trim: true, maxlength: 120, index: true },
  separationType: { type: String, default: '', trim: true, maxlength: 100, index: true },
  exitDate: { type: Date, index: true },
  exitReason: { type: String, trim: true, maxlength: 1000 },
  reactivationDate: { type: Date },
  reactivationReason: { type: String, trim: true, maxlength: 1000 },
  statusHistory: [{
    action: { type: String, enum: ['deactivated', 'reactivated'], required: true },
    date: { type: Date, default: Date.now },
    separationType: { type: String, trim: true },
    reason: { type: String, trim: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedByName: { type: String, trim: true },
  }],
  lastLoginAt: { type: Date },
  passwordChangedAt: { type: Date },
  tokenVersion: { type: Number, default: 0, select: false },
  failedLoginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  optimisticConcurrency: true,
  toJSON: {
    transform: (_doc, result) => {
      delete result.password;
      delete result.tokenVersion;
      delete result.failedLoginAttempts;
      delete result.lockUntil;
      return result;
    },
  },
});

userSchema.index({ name: 'text', email: 'text', employeeId: 'text' });
userSchema.index({ role: 1, isActive: 1, deletedAt: 1 });

userSchema.pre('validate', async function assignEmployeeId() {
  if (!this.isNew || this.employeeId) return;
  const counter = await Counter.findByIdAndUpdate(
    'employeeId',
    { $inc: { sequence: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  );
  this.employeeId = `Vah${String(counter.sequence).padStart(4, '0')}`;
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, env.bcryptRounds);
  this.passwordChangedAt = new Date();
  if (!this.isNew) this.tokenVersion += 1;
});

userSchema.methods.matchPassword = function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isLocked = function isLocked() {
  if (env.nodeEnv === 'development') {
    return false;
  }
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

userSchema.methods.recordFailedLogin = async function recordFailedLogin() {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    this.failedLoginAttempts = 0;
  }
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.recordSuccessfulLogin = async function recordSuccessfulLogin() {
  this.failedLoginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLoginAt = new Date();
  await this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('User', userSchema);
