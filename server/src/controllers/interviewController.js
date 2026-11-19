const Interview = require('../models/Interview');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const pick = require('../utils/pick');
const { writeAuditLog } = require('../services/auditService');

const FIELDS = [
  'entryDate', 'candidateName', 'status', 'interviewDate', 'candidatePost', 'interviewTime',
  'phoneNumber', 'firstRoundBy', 'secondRoundBy', 'candidateDOB', 'email', 'replyStatus',
  'joiningDateProvided', 'candidateJoinedOn', 'trainingStatus', 'remarks', 'salaryStructure',
  'incentiveStructure', 'firstMailStatus', 'finalMailStatus',
];

const normalizePayload = (body) => {
  const payload = pick(body, FIELDS);
  if (payload.candidateName !== undefined) payload.candidateName = validators.requiredString(payload.candidateName, 'candidateName', { max: 120 });
  if (payload.status !== undefined) payload.status = validators.enumValue(payload.status, Interview.statuses, 'status');
  if (payload.email) payload.email = validators.email(payload.email);
  return payload;
};

const getInterviews = asyncHandler(async (req, res) => {
  const query = {};
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

module.exports = { getInterviews, getInterviewById, createInterview, updateInterview, deleteInterview };
