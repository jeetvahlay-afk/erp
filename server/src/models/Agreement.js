const mongoose = require('mongoose');

const agreementSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruitmentManagement',
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    recipientType: {
      type: String,
      enum: ['candidate', 'employee'],
      default: 'candidate',
      index: true,
    },
    candidateName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      index: true,
    },
    candidateEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      index: true,
    },
    candidatePhone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    department: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    officeLocation: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'Ahmedabad',
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: 'Vahlay Consulting Inc.',
    },
    templateId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    templateName: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    documentTitle: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    templateContent: {
      type: String,
      default: '',
    },
    documentContent: {
      type: String,
      default: '',
    },
    fields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    uploadedDocuments: [
      {
        id: { type: String },
        name: { type: String, trim: true },
        fileName: { type: String, trim: true },
        size: { type: String, trim: true },
        bytes: { type: Number },
        url: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    questionAnswers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'signed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    signingToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    candidateHasSigned: {
      type: Boolean,
      default: false,
      index: true,
    },
    candidateSignatureImage: {
      type: String,
      default: '',
    },
    signedAt: {
      type: Date,
      index: true,
    },
    signedIp: {
      type: String,
      trim: true,
    },
    signedUserAgent: {
      type: String,
      trim: true,
    },
    managerSignatureImage: {
      type: String,
      default: '',
    },
    managerName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: 'Harshad Prajapati (HR/Manger)',
    },
    pdfUrl: {
      type: String,
      trim: true,
    },
    zipDownloadUrl: {
      type: String,
      trim: true,
    },
    emailDelivery: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      messageId: { type: String, trim: true },
      error: { type: String, trim: true },
    },
    signedConfirmationDelivery: {
      sentToRecipient: { type: Boolean, default: false },
      sentToRecipientAt: { type: Date },
      sentToAdmin: { type: Boolean, default: false },
      sentToAdminAt: { type: Date },
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

agreementSchema.index({ candidate: 1, templateId: 1 });
agreementSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Agreement', agreementSchema);
