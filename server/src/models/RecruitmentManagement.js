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
  'Pending',
  'pending',
  'Running',
  'running',
  'Red',
  'red',
  'Yellow',
  'yellow',
  'Green',
  'green',
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
  'Probation',
  'probation',
  'Moved to Probation',
  'moved to probation',
];

const STAGES = [
  'Daily Candidates Update',
  'Daily Candidate Update',
  'Assessment Update',
  'Interview Candidate Updates',
  'Training Candidates',
  'Joined Candidates',
];

const getStageForStatus = (status) => {
  const s = String(status || '').toLowerCase();
  if (['new candidate info', 'new candidates info', 'interview scheduled', 'scheduled', 'reschedule', 'rescheduled', 'no response', 'no respones'].includes(s)) {
    return 'Daily Candidates Update';
  }
  if (['assessment done', 'assessment', 'pending', 'running', 'red', 'yellow', 'green'].some((k) => s.includes(k))) {
    return 'Assessment Update';
  }
  if (['1st round', '2nd round', 'selected', 'rejected'].includes(s)) {
    return 'Interview Candidate Updates';
  }
  if (['in training', 'training candidates', 'training', 'all trainees', 'ongoing', 'completed', 'ineligible', 'left', 'discontinued', 'probation', 'moved to probation'].includes(s)) {
    return 'Training Candidates';
  }
  if (['joined'].includes(s)) {
    return 'Joined Candidates';
  }
  return 'Daily Candidates Update';
};

const recruitmentManagementSchema = new mongoose.Schema(
  {
    // Candidate Identity
    entryDate: { type: Date, default: Date.now, index: true },
    candidateName: { type: String, required: true, trim: true, maxlength: 120, index: true },
    candidateReference: { type: String, trim: true, maxlength: 150, index: true },
    candidateCode: { type: String, trim: true, maxlength: 150, index: true },
    email: { type: String, lowercase: true, trim: true, maxlength: 254, index: true },
    phoneNumber: { type: String, trim: true, maxlength: 30 },
    candidateDOB: { type: Date },
    gender: { type: String, trim: true, maxlength: 30 },
    maritalStatus: { type: String, trim: true, maxlength: 30 },
    religion: { type: String, trim: true, maxlength: 80 },
    address: { type: String, trim: true, maxlength: 300 },
    currentLocation: { type: String, trim: true, maxlength: 150 },

    // Role & Experience
    branch: { type: String, trim: true, maxlength: 100, default: 'Ahmedabad' },
    department: { type: String, trim: true, maxlength: 120 },
    candidatePost: { type: String, trim: true, maxlength: 120, index: true },
    positionAppliedFor: { type: String, trim: true, maxlength: 120 },
    candidateType: { type: String, enum: ['Fresher', 'Experienced'], default: 'Fresher' },
    experience: { type: String, trim: true, maxlength: 120 },
    experienceType: { type: String, trim: true, maxlength: 50 },
    course: { type: String, trim: true, maxlength: 150 },
    college: { type: String, trim: true, maxlength: 200 },
    totalExperience: { type: String, trim: true, maxlength: 80 },
    cvUrl: { type: String, trim: true, maxlength: 500 },

    // Recruitment Stages & Status
    stage: { type: String, enum: STAGES, default: 'Daily Candidates Update', index: true },
    status: { type: String, enum: STATUSES, default: 'New candidates info', index: true },

    // Assessment & Score Fields
    interviewScore: { type: String, trim: true, maxlength: 80 },
    assessmentScore: { type: String, trim: true, maxlength: 80 },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 30 },
    percentage: { type: Number, default: 0 },
    colorCategory: { type: String, enum: ['Pending', 'Running', 'Green', 'Yellow', 'Red'], default: 'Pending', index: true },
    tabSwitchCount: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    assessmentKey: { type: String, trim: true },

    // Interview & Onboarding
    interviewDate: { type: Date, index: true },
    interviewTime: { type: String, trim: true, maxlength: 50 },
    firstRoundBy: { type: String, trim: true, maxlength: 120 },
    secondRoundBy: { type: String, trim: true, maxlength: 120 },
    replyStatus: { type: String, trim: true, maxlength: 80 },
    joiningDateProvided: { type: Date },
    candidateJoinedOn: { type: Date },
    trainingStatus: { type: String, trim: true, maxlength: 120 },
    trainingStartDate: { type: Date, index: true },
    trainingDay8Notified: { type: Boolean, default: false, index: true },
    trainingDay8NotifiedAt: { type: Date },
    trainingDay8Decision: { type: String, enum: ['Pending', 'Moved to Probation', 'Extended Training', 'Completed', 'Ineligible'], default: 'Pending' },
    probationStartDate: { type: Date, index: true },
    probationDurationMonths: { type: Number, default: 3 },
    probation3MonthNotified: { type: Boolean, default: false, index: true },
    probation3MonthNotifiedAt: { type: Date },
    probation3MonthDecision: { type: String, enum: ['Pending', 'Official', 'Extended', 'Terminated'], default: 'Pending' },
    convertedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    reference: { type: String, trim: true, maxlength: 150 },
    salaryStructure: { type: String, trim: true, maxlength: 500 },
    incentiveStructure: { type: String, trim: true, maxlength: 500 },
    firstMailStatus: { type: String, trim: true, maxlength: 80 },
    finalMailStatus: { type: String, trim: true, maxlength: 80 },

    // Audit & Notes
    remarks: { type: String, trim: true, maxlength: 2000 },
    comments: { type: String, trim: true, maxlength: 2000 },
    stageNotes: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    collection: 'recruitment_management',
    timestamps: true,
    optimisticConcurrency: false,
  }
);

recruitmentManagementSchema.index({ candidateName: 'text', email: 'text', phoneNumber: 'text', candidatePost: 'text' });
recruitmentManagementSchema.index({ status: 1, interviewDate: 1 });
recruitmentManagementSchema.index({ stage: 1, status: 1 });

recruitmentManagementSchema.pre('validate', function () {
  if (this.status && (!this.stage || this.isModified('status'))) {
    this.stage = getStageForStatus(this.status);
  }
  const statusLower = String(this.status || '').toLowerCase();
  const stageLower = String(this.stage || '').toLowerCase();
  const isTrainingActive = stageLower.includes('training') || ['ongoing', 'in training', 'training', 'all trainees'].includes(statusLower);

  if (isTrainingActive && !this.trainingStartDate) {
    this.trainingStartDate = this.candidateJoinedOn || this.joiningDateProvided || this.entryDate || new Date();
  }
  if (['probation', 'moved to probation'].includes(statusLower)) {
    this.trainingDay8Decision = 'Moved to Probation';
    if (!this.probationStartDate) this.probationStartDate = new Date();
  }
  if (this.comments && !this.remarks) this.remarks = this.comments;
  if (this.remarks && !this.comments) this.comments = this.remarks;
  if (this.candidateReference && !this.candidateCode) this.candidateCode = this.candidateReference;
  if (this.candidateCode && !this.candidateReference) this.candidateReference = this.candidateCode;
  if (this.interviewScore && !this.assessmentScore) this.assessmentScore = this.interviewScore;
  if (this.assessmentScore && !this.interviewScore) this.interviewScore = this.assessmentScore;
});

recruitmentManagementSchema.statics.statuses = STATUSES;
recruitmentManagementSchema.statics.stages = STAGES;
recruitmentManagementSchema.statics.getStageForStatus = getStageForStatus;

const RecruitmentManagement =
  mongoose.models.RecruitmentManagement ||
  mongoose.model('RecruitmentManagement', recruitmentManagementSchema, 'recruitment_management');

module.exports = RecruitmentManagement;
