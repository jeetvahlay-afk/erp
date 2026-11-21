const Interview = require('../models/Interview');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const pick = require('../utils/pick');
const { writeAuditLog } = require('../services/auditService');
const { convertCandidateToProbationEmployee } = require('../services/trainingMilestoneService');

const FIELDS = [
  'entryDate', 'candidateName', 'stage', 'status', 'candidateReference', 'candidateCode', 'reference', 'branch', 'interviewDate',
  'candidatePost', 'interviewTime', 'phoneNumber', 'firstRoundBy', 'secondRoundBy', 'candidateDOB',
  'email', 'replyStatus', 'joiningDateProvided', 'candidateJoinedOn', 'trainingStatus',
  'gender', 'maritalStatus', 'address', 'experience', 'experienceType', 'candidateType', 'cvUrl', 'interviewScore',
  'assessmentScore', 'remarks', 'comments', 'salaryStructure', 'incentiveStructure', 'firstMailStatus', 'finalMailStatus',
  'stageNotes', 'convertedUserId', 'probationStartDate', 'probationDurationMonths', 'probation3MonthNotified', 'probation3MonthDecision',
];

const normalizePayload = (body) => {
  const payload = pick(body, FIELDS);
  if (payload.candidateName !== undefined) {
    payload.candidateName = validators.requiredString(payload.candidateName, 'candidateName', { max: 120 });
  }
  if (payload.phoneNumber !== undefined) {
    payload.phoneNumber = String(payload.phoneNumber || '').trim();
  }
  if (payload.status !== undefined) {
    const rawStatus = String(payload.status).trim();
    const matched = Interview.statuses.find((s) => s.toLowerCase() === rawStatus.toLowerCase());
    payload.status = matched || validators.enumValue(rawStatus, Interview.statuses, 'status');
    payload.stage = Interview.getStageForStatus(payload.status);
  } else if (payload.stage !== undefined) {
    payload.stage = validators.enumValue(payload.stage, Interview.stages, 'stage');
  }
  if (payload.comments && !payload.remarks) payload.remarks = payload.comments;
  if (payload.remarks && !payload.comments) payload.comments = payload.remarks;
  if (payload.candidateReference && !payload.candidateCode) payload.candidateCode = payload.candidateReference;
  if (payload.candidateCode && !payload.candidateReference) payload.candidateReference = payload.candidateCode;
  if (payload.interviewScore && !payload.assessmentScore) payload.assessmentScore = payload.interviewScore;
  if (payload.assessmentScore && !payload.interviewScore) payload.interviewScore = payload.assessmentScore;
  if (payload.experienceType && !payload.candidateType && ['Fresher', 'Experienced'].includes(payload.experienceType)) {
    payload.candidateType = payload.experienceType;
  }
  if (payload.email !== undefined) {
    const trimmed = String(payload.email || '').trim();
    if (!trimmed) {
      delete payload.email;
    } else {
      payload.email = validators.email(trimmed);
    }
  }
  return payload;
};

const getInterviews = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.stage) query.stage = req.query.stage;
  if (req.query.status) query.status = req.query.status;
  if (req.query.search) query.$text = { $search: String(req.query.search).trim() };
  const interviews = await Interview.find(query).sort({ entryDate: -1, createdAt: -1 }).lean();
  res.json(interviews);
});

const getInterviewById = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'interview id');
  const interview = await Interview.findById(req.params.id).lean();
  if (!interview) throw new AppError('Interview not found', 404, 'INTERVIEW_NOT_FOUND');
  res.json(interview);
});

const createInterview = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);
  if (!payload.candidateName) throw new AppError('Candidate name is required', 400, 'VALIDATION_ERROR');
  const interview = await Interview.create({ ...payload, createdBy: req.user._id, updatedBy: req.user._id });
  await writeAuditLog(req, 'interview.created', 'Interview', interview._id, { candidateName: interview.candidateName });
  res.status(201).json(interview);
});

const updateInterview = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'interview id');
  const payload = normalizePayload(req.body);

  const existing = await Interview.findById(req.params.id);
  if (!existing) throw new AppError('Interview not found', 404, 'INTERVIEW_NOT_FOUND');

  // If candidate is moved to probation, automatically convert to probation employee
  const targetStatus = String(payload.status || existing.status || '').toLowerCase();
  if (['probation', 'moved to probation'].includes(targetStatus) && !existing.convertedUserId) {
    const probationEmployee = await convertCandidateToProbationEmployee(existing, req.user);
    payload.convertedUserId = probationEmployee._id;
    if (!payload.probationStartDate && !existing.probationStartDate) {
      payload.probationStartDate = new Date();
    }
    payload.probationDurationMonths = 3;
  }

  const interview = await Interview.findByIdAndUpdate(
    req.params.id,
    { $set: { ...payload, updatedBy: req.user._id } },
    { returnDocument: 'after', runValidators: true },
  );
  if (!interview) throw new AppError('Interview not found', 404, 'INTERVIEW_NOT_FOUND');
  await writeAuditLog(req, 'interview.updated', 'Interview', interview._id, { fields: Object.keys(payload) });
  res.json(interview);
});

const deleteInterview = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'interview id');
  const interview = await Interview.findByIdAndDelete(req.params.id);
  if (!interview) throw new AppError('Interview not found', 404, 'INTERVIEW_NOT_FOUND');
  await writeAuditLog(req, 'interview.deleted', 'Interview', interview._id, { candidateName: interview.candidateName });
  res.json({ message: 'Interview removed successfully' });
});

const decideProbation = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'candidate id');
  const candidate = await Interview.findById(req.params.id);
  if (!candidate) throw new AppError('Candidate not found', 404, 'CANDIDATE_NOT_FOUND');

  const { decision, reason } = req.body;
  validators.ensure(['probation', 'extend', 'ineligible'].includes(decision), 'Valid decision (probation, extend, ineligible) is required', 'decision');

  let newStatus = candidate.status;
  let newStage = candidate.stage;
  let decisionSummary = '';

  if (decision === 'probation') {
    newStatus = 'Moved to Probation';
    newStage = 'Training Candidates';
    candidate.status = newStatus;
    candidate.stage = newStage;
    candidate.trainingStatus = 'Moved to Probation';
    candidate.probationStartDate = new Date();
    candidate.probationDurationMonths = 3;
    candidate.trainingDay8Decision = 'Moved to Probation';

    // Convert candidate into an employee with tag "Probation"
    const probationEmployee = await convertCandidateToProbationEmployee(candidate, req.user);
    candidate.convertedUserId = probationEmployee._id;

    decisionSummary = `${candidate.candidateName} moved to Probation Period and converted to Employee (${probationEmployee.employeeId || probationEmployee.name}) with tag 'Probation'`;
  } else if (decision === 'extend') {
    candidate.trainingDay8Decision = 'Extended Training';
    decisionSummary = `${candidate.candidateName} retained in Training for extended evaluation`;
  } else if (decision === 'ineligible') {
    newStatus = 'Ineligible';
    candidate.status = newStatus;
    candidate.trainingStatus = 'Ineligible';
    candidate.trainingDay8Decision = 'Ineligible';
    decisionSummary = `${candidate.candidateName} marked ineligible after training`;
  }

  candidate.updatedBy = req.user._id;
  const existingNotes = candidate.stageNotes && typeof candidate.stageNotes === 'object' ? { ...candidate.stageNotes } : {};
  const noteEntry = `[Probation Decision by ${req.user.name} on ${new Date().toISOString().slice(0, 10)}]: ${decision.toUpperCase()}${reason ? ` - ${reason}` : ''}`;
  existingNotes.training = existingNotes.training ? `${existingNotes.training}\n${noteEntry}` : noteEntry;
  candidate.stageNotes = existingNotes;

  await candidate.save();

  await writeAuditLog(req, 'recruitment.probation_decision', 'RecruitmentManagement', candidate._id, {
    candidateName: candidate.candidateName,
    decision,
    newStatus,
    reason: reason || '',
    summary: `${req.user.name} decided 8-day training outcome for ${candidate.candidateName}: ${decision.toUpperCase()}${reason ? ` (${reason})` : ''}`,
  });

  res.json({
    candidate,
    message: decisionSummary,
  });
});

module.exports = { getInterviews, getInterviewById, createInterview, updateInterview, deleteInterview, decideProbation };
