const mongoose = require('mongoose');

const STATUSES = [
  'New Candidate Info',
  'New candidates info',
  'Interview Scheduled',
  'interview scheduled',
  'Reschedule',
  'Rescheduled',
  'No Response',
  'no respones',
  'Assessment Done',
  'assessment done',
  '1st Round',
  '1st round',
  '2nd Round',
  '2nd round',
  'Selected',
  'selected',
  'Rejected',
  'rejected',
  'In Training',
  'Training Candidates',
  'training candidates',
  'Training',
  'All Trainees',
  'Ongoing',
  'ongoing',
  'Completed',
  'completed',
  'Ineligible',
  'ineligible',
  'Left',
  'left',
  'Discontinued',
  'discontinued',
  'Joined',
  'Scheduled',
];

const STAGES = [
  'Daily Candidates Update',
  'Interview Candidate Updates',
  'Training Candidates',
  'Joined Candidates',
];

const getStageForStatus = (status) => {
  const s = String(status || '').toLowerCase();
  if (['new candidate info', 'new candidates info', 'interview scheduled', 'scheduled', 'reschedule', 'rescheduled', 'no response', 'no respones'].includes(s)) {
    return 'Daily Candidates Update';
  }
  if (['assessment done', '1st round', '2nd round', 'selected', 'rejected'].includes(s)) {
    return 'Interview Candidate Updates';
  }
  if (['in training', 'training candidates', 'training', 'all trainees', 'ongoing', 'completed', 'ineligible', 'left', 'discontinued'].includes(s)) {
    return 'Training Candidates';
  }
  if (['joined'].includes(s)) {
    return 'Joined Candidates';
  }
  return 'Daily Candidates Update';
};

const interviewSchema = new mongoose.Schema({
  entryDate: { type: Date, default: Date.now, index: true },
  candidateName: { type: String, required: true, trim: true, maxlength: 120 },
  stage: { type: String, enum: STAGES, default: 'Daily Candidates Update', index: true },
  status: { type: String, enum: STATUSES, default: 'New candidates info', index: true },
  candidateReference: { type: String, trim: true, maxlength: 150 },
  branch: { type: String, trim: true, maxlength: 100, default: 'Ahmedabad' },
  interviewDate: { type: Date, index: true },
  candidatePost: { type: String, trim: true, maxlength: 120, index: true },
  interviewTime: { type: String, trim: true, maxlength: 50 },
  phoneNumber: { type: String, trim: true, maxlength: 30 },
  firstRoundBy: { type: String, trim: true, maxlength: 120 },
  secondRoundBy: { type: String, trim: true, maxlength: 120 },
  candidateDOB: { type: Date },
  email: { type: String, lowercase: true, trim: true, maxlength: 254 },
  replyStatus: { type: String, trim: true, maxlength: 80 },
  joiningDateProvided: { type: Date },
  candidateJoinedOn: { type: Date },
  trainingStatus: { type: String, trim: true, maxlength: 120 },
  gender: { type: String, trim: true, maxlength: 30 },
  maritalStatus: { type: String, trim: true, maxlength: 30 },
  address: { type: String, trim: true, maxlength: 300 },
  experience: { type: String, trim: true, maxlength: 50 },
  experienceType: { type: String, trim: true, maxlength: 50 },
  cvUrl: { type: String, trim: true, maxlength: 500 },
  interviewScore: { type: String, trim: true, maxlength: 50 },
  reference: { type: String, trim: true, maxlength: 150 },
  remarks: { type: String, trim: true, maxlength: 2000 },
  comments: { type: String, trim: true, maxlength: 2000 },
  stageNotes: { type: mongoose.Schema.Types.Mixed, default: {} },
  salaryStructure: { type: String, trim: true, maxlength: 500 },
  incentiveStructure: { type: String, trim: true, maxlength: 500 },
  firstMailStatus: { type: String, trim: true, maxlength: 80 },
  finalMailStatus: { type: String, trim: true, maxlength: 80 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, optimisticConcurrency: true });

interviewSchema.index({ candidateName: 'text', email: 'text', phoneNumber: 'text', candidatePost: 'text' });
interviewSchema.index({ status: 1, interviewDate: 1 });
interviewSchema.index({ stage: 1, status: 1 });

interviewSchema.pre('validate', function () {
  if (this.status && (!this.stage || this.isModified('status'))) {
    this.stage = getStageForStatus(this.status);
  }
  if (this.comments && !this.remarks) this.remarks = this.comments;
  if (this.remarks && !this.comments) this.comments = this.remarks;
});

interviewSchema.statics.statuses = STATUSES;
interviewSchema.statics.stages = STAGES;
interviewSchema.statics.getStageForStatus = getStageForStatus;

module.exports = mongoose.model('Interview', interviewSchema);
