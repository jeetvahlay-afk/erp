const mongoose = require('mongoose');

const STATUSES = ['Scheduled', '1st Round Pending', '1st Round Completed', '2nd Round Pending', '2nd Round Completed', 'Selected', 'Rejected', 'Joined', 'Not Joined', 'Training'];

const interviewSchema = new mongoose.Schema({
  entryDate: { type: Date, default: Date.now, index: true },
  candidateName: { type: String, required: true, trim: true, maxlength: 120 },
  status: { type: String, enum: STATUSES, default: 'Scheduled', index: true },
  interviewDate: { type: Date, index: true },
  candidatePost: { type: String, trim: true, maxlength: 120, index: true },
  interviewTime: { type: String, trim: true, maxlength: 20 },
  phoneNumber: { type: String, trim: true, maxlength: 30 },
  firstRoundBy: { type: String, trim: true, maxlength: 120 },
  secondRoundBy: { type: String, trim: true, maxlength: 120 },
  candidateDOB: { type: Date },
  email: { type: String, lowercase: true, trim: true, maxlength: 254 },
  replyStatus: { type: String, trim: true, maxlength: 80 },
  joiningDateProvided: { type: Date },
  candidateJoinedOn: { type: Date },
  trainingStatus: { type: String, trim: true, maxlength: 120 },
  remarks: { type: String, trim: true, maxlength: 2000 },
  salaryStructure: { type: String, trim: true, maxlength: 500 },
  incentiveStructure: { type: String, trim: true, maxlength: 500 },
  firstMailStatus: { type: String, trim: true, maxlength: 80 },
  finalMailStatus: { type: String, trim: true, maxlength: 80 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, optimisticConcurrency: true });

interviewSchema.index({ candidateName: 'text', email: 'text', phoneNumber: 'text', candidatePost: 'text' });
interviewSchema.index({ status: 1, interviewDate: 1 });

interviewSchema.statics.statuses = STATUSES;

module.exports = mongoose.model('Interview', interviewSchema);
