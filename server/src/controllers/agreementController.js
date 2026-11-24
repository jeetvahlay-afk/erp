const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Agreement = require('../models/Agreement');
const RecruitmentManagement = require('../models/RecruitmentManagement');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { writeAuditLog } = require('../services/auditService');
const { dispatchNotifications, dispatchToActiveRoles } = require('../services/notificationService');
const { addEmailJob } = require('../queues/emailQueue');
const {
  sendAgreementDispatchEmail,
  sendAgreementSignedConfirmationToRecipient,
  sendAgreementSignedAlertToHR,
} = require('../services/agreementMailService');

const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAllAgreements = asyncHandler(async (req, res) => {
  const { candidateId, employeeId, recipientType, status, templateId, search } = req.query;
  const query = {};
  const andClauses = [];

  if (candidateId) {
    if (mongoose.isValidObjectId(candidateId)) {
      const candidateRecord = await RecruitmentManagement.findById(candidateId).lean();
      const matchConditions = [
        { candidate: new mongoose.Types.ObjectId(candidateId) },
        { candidateId: candidateId },
        { 'fields.candidateId': candidateId },
      ];
      if (candidateRecord) {
        if (candidateRecord.email) {
          matchConditions.push({
            candidateEmail: new RegExp(`^${escapeRegex(candidateRecord.email.trim())}$`, 'i'),
          });
        }
        if (candidateRecord.convertedUserId) {
          matchConditions.push({
            employee: new mongoose.Types.ObjectId(candidateRecord.convertedUserId),
          });
        }
        if (candidateRecord.candidateName) {
          matchConditions.push({
            candidateName: new RegExp(`^${escapeRegex(candidateRecord.candidateName.trim())}$`, 'i'),
          });
        }
      }
      andClauses.push({ $or: matchConditions });
    } else {
      return res.json([]);
    }
  }

  if (employeeId) {
    if (mongoose.isValidObjectId(employeeId)) {
      const empRecord = await User.findById(employeeId).lean();
      const matchConditions = [
        { employee: new mongoose.Types.ObjectId(employeeId) },
        { employeeId: employeeId },
        { 'fields.employeeId': employeeId },
      ];
      if (empRecord) {
        if (empRecord.email) {
          matchConditions.push({
            candidateEmail: new RegExp(`^${escapeRegex(empRecord.email.trim())}$`, 'i'),
          });
        }
        if (empRecord.name) {
          matchConditions.push({
            candidateName: new RegExp(`^${escapeRegex(empRecord.name.trim())}$`, 'i'),
          });
        }
        const linkedCand = await RecruitmentManagement.findOne({
          $or: [
            { convertedUserId: empRecord._id },
            { email: new RegExp(`^${escapeRegex(empRecord.email.trim())}$`, 'i') },
          ],
        }).lean();
        if (linkedCand) {
          matchConditions.push({
            candidate: new mongoose.Types.ObjectId(linkedCand._id),
          });
        }
      }
      andClauses.push({ $or: matchConditions });
    } else {
      return res.json([]);
    }
  }

  if (status) {
    query.status = status;
  }

  if (templateId) {
    query.templateId = templateId;
  }

  if (req.user?.dataScope === 'department' && req.user.department) {
    const deptRegex = new RegExp(`^${escapeRegex(req.user.department)}$`, 'i');
    andClauses.push({
      $or: [
        { department: deptRegex },
        { 'fields.department': deptRegex },
      ],
    });
  }

  if (search) {
    const s = escapeRegex(search.trim());
    andClauses.push({
      $or: [
        { candidateName: new RegExp(s, 'i') },
        { candidateEmail: new RegExp(s, 'i') },
        { documentTitle: new RegExp(s, 'i') },
        { templateName: new RegExp(s, 'i') },
      ],
    });
  }

  if (andClauses.length > 0) {
    query.$and = andClauses;
  }

  const agreements = await Agreement.find(query)
    .populate('candidate', 'candidateName email phoneNumber candidatePost branch stage status')
    .populate('employee', 'name email employeeId department designation branch')
    .sort({ createdAt: -1 })
    .lean();

  res.json(agreements);
});

const getAgreementById = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'agreementId');
  const agreement = await Agreement.findById(req.params.id)
    .populate('candidate', 'candidateName email phoneNumber candidatePost branch stage status')
    .populate('employee', 'name email employeeId department designation branch')
    .lean();

  if (!agreement) {
    throw new AppError('Agreement not found', 404, 'AGREEMENT_NOT_FOUND');
  }

  res.json(agreement);
});

const getPublicAgreement = asyncHandler(async (req, res) => {
  const identifier = String(req.params.id || '').trim();
  let agreement = null;

  if (validators.isObjectId(identifier)) {
    agreement = await Agreement.findById(identifier).lean();
  }

  if (!agreement) {
    agreement = await Agreement.findOne({ signingToken: identifier }).lean();
  }

  if (!agreement) {
    throw new AppError('Agreement not found or link has expired', 404, 'AGREEMENT_NOT_FOUND');
  }

  res.json({
    _id: agreement._id,
    candidateName: agreement.candidateName,
    candidateEmail: agreement.candidateEmail,
    jobTitle: agreement.jobTitle,
    department: agreement.department,
    officeLocation: agreement.officeLocation,
    companyName: agreement.companyName,
    templateId: agreement.templateId,
    templateName: agreement.templateName,
    documentTitle: agreement.documentTitle,
    documentContent: agreement.documentContent,
    fields: agreement.fields,
    uploadedDocuments: agreement.uploadedDocuments || [],
    status: agreement.status,
    candidateHasSigned: agreement.candidateHasSigned,
    candidateSignatureImage: agreement.candidateSignatureImage,
    signedAt: agreement.signedAt,
    questionAnswers: agreement.questionAnswers || {},
    managerSignatureImage: agreement.managerSignatureImage,
    managerName: agreement.managerName,
    assignedAt: agreement.assignedAt,
  });
});

const createOrUpdateAgreement = asyncHandler(async (req, res) => {
  const {
    candidateId,
    employeeId,
    recipientType = employeeId ? 'employee' : 'candidate',
    candidateName,
    candidateEmail,
    candidatePhone,
    jobTitle,
    department,
    officeLocation,
    companyName,
    templateId,
    templateName,
    documentTitle,
    templateContent,
    documentContent,
    fields,
    uploadedDocuments,
    status = 'pending',
    managerSignatureImage,
    managerName,
    resetSigning = false,
  } = req.body;

  // Check if updating an existing agreement by ID directly (e.g. PUT /api/agreements/:id)
  let agreement = null;
  if (req.params.id && validators.isObjectId(req.params.id)) {
    agreement = await Agreement.findById(req.params.id);
  }

  const effectiveTemplateId = templateId || agreement?.templateId;
  validators.ensure(effectiveTemplateId, 'Template ID is required', 'templateId');
  validators.ensure(
    candidateName || candidateId || employeeId || agreement,
    'Recipient information is required',
    'candidateName'
  );

  let resolvedCandidate = null;
  const effectiveCandId = candidateId || agreement?.candidate;
  if (effectiveCandId && validators.isObjectId(effectiveCandId)) {
    resolvedCandidate = await RecruitmentManagement.findById(effectiveCandId);
  }

  let resolvedEmployee = null;
  const effectiveEmpId = employeeId || agreement?.employee;
  if (effectiveEmpId && validators.isObjectId(effectiveEmpId)) {
    resolvedEmployee = await User.findById(effectiveEmpId);
  }

  const cleanName =
    candidateName ||
    agreement?.candidateName ||
    resolvedCandidate?.candidateName ||
    resolvedEmployee?.name ||
    'Recipient';

  const cleanEmail = (
    candidateEmail ||
    agreement?.candidateEmail ||
    resolvedCandidate?.email ||
    resolvedEmployee?.email ||
    ''
  ).trim().toLowerCase();

  const cleanPhone =
    candidatePhone ||
    agreement?.candidatePhone ||
    resolvedCandidate?.phoneNumber ||
    resolvedEmployee?.phone ||
    '';

  const cleanJob =
    jobTitle ||
    agreement?.jobTitle ||
    resolvedCandidate?.candidatePost ||
    resolvedCandidate?.positionAppliedFor ||
    resolvedEmployee?.designation ||
    'Associate';

  const cleanDept =
    department ||
    agreement?.department ||
    resolvedCandidate?.department ||
    resolvedEmployee?.department ||
    'General';

  const cleanLoc =
    officeLocation ||
    agreement?.officeLocation ||
    resolvedCandidate?.branch ||
    resolvedEmployee?.branch ||
    'Ahmedabad';

  // If not found by req.params.id, query by candidate or employee + templateId
  if (!agreement) {
    if (resolvedCandidate) {
      agreement = await Agreement.findOne({
        candidate: resolvedCandidate._id,
        templateId: effectiveTemplateId,
      });
    } else if (resolvedEmployee) {
      agreement = await Agreement.findOne({
        employee: resolvedEmployee._id,
        templateId: effectiveTemplateId,
      });
    }
  }

  const signingToken = agreement?.signingToken || crypto.randomUUID();

  if (agreement) {
    if (effectiveTemplateId) agreement.templateId = effectiveTemplateId;
    agreement.candidateName = cleanName;
    agreement.candidateEmail = cleanEmail;
    agreement.candidatePhone = cleanPhone;
    agreement.jobTitle = cleanJob;
    agreement.department = cleanDept;
    agreement.officeLocation = cleanLoc;
    agreement.companyName = companyName || agreement.companyName || 'Vahlay Consulting Inc.';
    agreement.templateName = templateName || agreement.templateName || effectiveTemplateId;
    agreement.documentTitle = documentTitle || agreement.documentTitle || agreement.templateName;
    if (templateContent !== undefined) agreement.templateContent = templateContent;
    if (documentContent !== undefined) agreement.documentContent = documentContent;
    if (fields) agreement.fields = fields;
    agreement.recipientType = recipientType;
    if (uploadedDocuments !== undefined) agreement.uploadedDocuments = uploadedDocuments;

    if (resetSigning || req.body.resetStatus === 'pending') {
      agreement.status = 'pending';
      agreement.candidateHasSigned = false;
      agreement.signedAt = null;
      agreement.signedIp = '';
      agreement.signedUserAgent = '';
      agreement.candidateSignatureImage = '';
      agreement.questionAnswers = {};
    } else if (
      agreement.status === 'signed' ||
      agreement.candidateHasSigned ||
      (agreement.signedAt && agreement.candidateSignatureImage)
    ) {
      // PRESERVE SIGNED STATUS: Do not accidentally downgrade an executed agreement to pending on edit/save!
      agreement.status = 'signed';
      agreement.candidateHasSigned = true;
    } else if (status) {
      agreement.status = status;
    }

    if (managerSignatureImage !== undefined) agreement.managerSignatureImage = managerSignatureImage;
    if (managerName !== undefined) agreement.managerName = managerName;
    if (!agreement.candidate && effectiveCandId && validators.isObjectId(effectiveCandId)) {
      agreement.candidate = effectiveCandId;
    }
    if (!agreement.employee && effectiveEmpId && validators.isObjectId(effectiveEmpId)) {
      agreement.employee = effectiveEmpId;
    }
    agreement.updatedBy = req.user?._id;
    await agreement.save();
  } else {
    agreement = await Agreement.create({
      candidate: resolvedCandidate?._id || (effectiveCandId && validators.isObjectId(effectiveCandId) ? effectiveCandId : null),
      employee: resolvedEmployee?._id || (effectiveEmpId && validators.isObjectId(effectiveEmpId) ? effectiveEmpId : null),
      recipientType,
      candidateName: cleanName,
      candidateEmail: cleanEmail,
      candidatePhone: cleanPhone,
      jobTitle: cleanJob,
      department: cleanDept,
      officeLocation: cleanLoc,
      companyName: companyName || 'Vahlay Consulting Inc.',
      templateId: effectiveTemplateId,
      templateName: templateName || effectiveTemplateId,
      documentTitle: documentTitle || templateName || effectiveTemplateId,
      templateContent: templateContent || '',
      documentContent: documentContent || '',
      fields: fields || {},
      uploadedDocuments: uploadedDocuments || [],
      status: status || 'pending',
      signingToken,
      managerSignatureImage: managerSignatureImage || '',
      managerName: managerName || 'Harshad Prajapati (HR/Manger)',
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
      assignedAt: new Date(),
    });
  }

  await writeAuditLog(req, 'agreement.saved', 'Agreement', agreement._id, {
    templateId,
    status: agreement.status,
    candidateName: cleanName,
  });

  const appBase = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
  const signingUrl = `${appBase}/candidate-agreement/${agreement._id}`;

  let emailSent = false;
  let emailError = '';

  // SEND WAY: Dispatches official agreement notification to candidate/employee email via SMTP
  if (agreement.status === 'pending' && cleanEmail) {
    try {
      const mailResult = await sendAgreementDispatchEmail({
        agreement,
        signingUrl,
      });

      if (mailResult.ok) {
        emailSent = true;
        agreement.emailDelivery = {
          sent: true,
          sentAt: new Date(),
          messageId: mailResult.messageId,
          error: '',
        };
        await agreement.save();
      } else {
        emailError = mailResult.error || 'Failed to dispatch email';
        agreement.emailDelivery = {
          sent: false,
          error: emailError,
        };
        await agreement.save();
      }
    } catch (mailErr) {
      emailError = mailErr.message || 'SMTP exception';
      agreement.emailDelivery = {
        sent: false,
        error: emailError,
      };
      await agreement.save();
    }
  }

  res.status(200).json({
    message: agreement.status === 'draft' ? 'Agreement draft saved' : 'Agreement dispatched for candidate signature',
    agreement,
    signingUrl,
    emailSent,
    emailError,
  });
});

const signAgreement = asyncHandler(async (req, res) => {
  const identifier = String(req.params.id || '').trim();
  const { candidateSignatureImage, questionAnswers, termsAccepted } = req.body;

  validators.ensure(candidateSignatureImage, 'Signature is required to sign agreement', 'candidateSignatureImage');
  validators.ensure(termsAccepted, 'You must accept the terms to complete signing', 'termsAccepted');

  let agreement = null;
  if (validators.isObjectId(identifier)) {
    agreement = await Agreement.findById(identifier);
  }
  if (!agreement) {
    agreement = await Agreement.findOne({ signingToken: identifier });
  }

  if (!agreement) {
    throw new AppError('Agreement not found or invalid link', 404, 'AGREEMENT_NOT_FOUND');
  }

  if (agreement.status === 'signed' || agreement.candidateHasSigned) {
    throw new AppError('This agreement has already been signed and legally verified.', 400, 'AGREEMENT_ALREADY_SIGNED');
  }

  agreement.candidateSignatureImage = candidateSignatureImage;
  agreement.questionAnswers = questionAnswers || {};
  agreement.candidateHasSigned = true;
  agreement.status = 'signed';
  agreement.signedAt = new Date();
  agreement.signedIp = req.ip || req.headers['x-forwarded-for'] || '';
  agreement.signedUserAgent = req.headers['user-agent'] || '';
  await agreement.save();

  // If linked to candidate in RecruitmentManagement, record milestone note
  if (agreement.candidate) {
    try {
      const candidateRecord = await RecruitmentManagement.findById(agreement.candidate);
      if (candidateRecord) {
        if (!candidateRecord.stageNotes) candidateRecord.stageNotes = {};
        candidateRecord.stageNotes[`agreement_${agreement.templateId}`] = {
          title: agreement.documentTitle,
          signedAt: agreement.signedAt,
          verified: true,
        };
        candidateRecord.markModified('stageNotes');
        await candidateRecord.save();
      }
    } catch (candErr) {
      console.warn('Could not update candidate stageNotes on agreement sign:', candErr);
    }
  }

  // RECEIVE WAY: Dispatches confirmation copy to recipient and alert to HR via BullMQ / SMTP
  try {
    const job1 = await addEmailJob('send-agreement-email', { type: 'signed_recipient', payload: { agreement } });
    const job2 = await addEmailJob('send-agreement-email', { type: 'signed_hr', payload: { agreement } });

    if (!job1 || !job2) {
      const [recipRes, hrRes] = await Promise.all([
        sendAgreementSignedConfirmationToRecipient({ agreement }),
        sendAgreementSignedAlertToHR({ agreement }),
      ]);

      agreement.signedConfirmationDelivery = {
        sentToRecipient: recipRes?.ok || false,
        sentToRecipientAt: recipRes?.ok ? new Date() : null,
        sentToAdmin: hrRes?.ok || false,
        sentToAdminAt: hrRes?.ok ? new Date() : null,
      };
      await agreement.save();
    }
  } catch (mailErr) {
    console.warn('Could not send agreement sign confirmation emails:', mailErr.message);
  }

  await dispatchToActiveRoles(['admin', 'super admin', 'hr'], {
    title: `Agreement Signed: ${agreement.candidateName}`,
    message: `${agreement.candidateName} has digitally signed "${agreement.documentTitle}".`,
    type: 'success',
    link: `/manage-interviews`,
    metadata: { agreementId: agreement._id, templateId: agreement.templateId },
  });

  res.json({
    message: 'Agreement signed and verified successfully',
    agreement: {
      _id: agreement._id,
      status: agreement.status,
      signedAt: agreement.signedAt,
      candidateHasSigned: agreement.candidateHasSigned,
      candidateName: agreement.candidateName,
      documentTitle: agreement.documentTitle,
    },
  });
});

const resendAgreementEmail = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'agreementId');
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    throw new AppError('Agreement not found', 404, 'AGREEMENT_NOT_FOUND');
  }

  const cleanEmail = String(agreement.candidateEmail || '').trim();
  if (!cleanEmail) {
    throw new AppError('Candidate email address is missing for this agreement.', 400, 'EMAIL_REQUIRED');
  }

  const appBase = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
  const signingUrl = `${appBase}/candidate-agreement/${agreement._id}`;

  const mailResult = await sendAgreementDispatchEmail({
    agreement,
    signingUrl,
  });

  if (mailResult.ok) {
    agreement.emailDelivery = {
      sent: true,
      sentAt: new Date(),
      messageId: mailResult.messageId,
      error: '',
    };
    await agreement.save();

    await writeAuditLog(req, 'agreement.email_resent', 'Agreement', agreement._id, {
      recipientEmail: agreement.candidateEmail,
      messageId: mailResult.messageId,
    });

    res.json({
      message: `Agreement email resent successfully via SMTP to ${agreement.candidateEmail}`,
      agreement,
      emailSent: true,
    });
  } else {
    agreement.emailDelivery = {
      sent: false,
      error: mailResult.error || 'Failed to resend email',
    };
    await agreement.save();

    throw new AppError(`SMTP delivery failed: ${mailResult.error || 'Unknown error'}`, 502, 'SMTP_DELIVERY_FAILED');
  }
});

const deleteAgreement = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'agreementId');
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    throw new AppError('Agreement not found', 404, 'AGREEMENT_NOT_FOUND');
  }

  await agreement.deleteOne();

  await writeAuditLog(req, 'agreement.deleted', 'Agreement', req.params.id, {
    templateId: agreement.templateId,
    candidateName: agreement.candidateName,
  });

  res.json({ message: 'Agreement deleted successfully' });
});

const uploadAgreementDoc = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'FILE_REQUIRED');
  }

  const formatSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const relativeUrl = `/uploads/documents/agreements/${req.file.filename}`;

  res.status(201).json({
    id: crypto.randomUUID(),
    name: req.file.originalname,
    fileName: req.file.originalname,
    title: req.file.originalname,
    size: formatSize(req.file.size),
    bytes: req.file.size,
    fileSize: req.file.size,
    fileUrl: relativeUrl,
    url: relativeUrl,
    downloadUrl: relativeUrl,
    uploadedAt: new Date().toISOString(),
  });
});

const getAgreementStats = asyncHandler(async (req, res) => {
  const [total, signed, pending, draft] = await Promise.all([
    Agreement.countDocuments({}),
    Agreement.countDocuments({ status: 'signed' }),
    Agreement.countDocuments({ status: 'pending' }),
    Agreement.countDocuments({ status: 'draft' }),
  ]);

  res.json({
    total,
    signed,
    pending,
    draft,
  });
});

module.exports = {
  getAllAgreements,
  getAgreementById,
  getPublicAgreement,
  createOrUpdateAgreement,
  signAgreement,
  resendAgreementEmail,
  deleteAgreement,
  uploadAgreementDoc,
  getAgreementStats,
};
