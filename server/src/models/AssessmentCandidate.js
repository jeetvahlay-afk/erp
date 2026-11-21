const mongoose = require('mongoose');

const assessmentCandidateSchema = new mongoose.Schema(
  {
    candidateCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    religion: {
      type: String,
      default: '',
      trim: true,
    },
    driveLocation: {
      type: String,
      default: 'Ahmedabad',
      trim: true,
    },
    department: {
      type: String,
      default: '',
      trim: true,
    },
    positionAppliedFor: {
      type: String,
      required: true,
      trim: true,
    },
    assessmentKey: {
      type: String,
      required: true,
      trim: true,
    },
    candidateType: {
      type: String,
      enum: ['Fresher', 'Experienced'],
      default: 'Fresher',
    },
    course: {
      type: String,
      default: '',
      trim: true,
    },
    college: {
      type: String,
      default: '',
      trim: true,
    },
    totalExperience: {
      type: String,
      default: '',
      trim: true,
    },
    currentLocation: {
      type: String,
      default: '',
      trim: true,
    },
    cvUrl: {
      type: String,
      default: '',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verificationOtp: {
      type: String,
      default: '',
    },
    otpExpiresAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Pending', 'Running', 'Completed'],
      default: 'Pending',
    },
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 50,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    colorCategory: {
      type: String,
      enum: ['Pending', 'Running', 'Red', 'Yellow', 'Green'],
      default: 'Pending',
    },
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    answers: {
      type: Map,
      of: String,
      default: {},
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AssessmentCandidate', assessmentCandidateSchema);
