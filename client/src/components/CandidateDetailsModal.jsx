import { useEffect, useState } from 'react';
import {
  Briefcase,
  Calendar,
  Check,
  Copy,
  Download,
  Edit3,
  FileText,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  PhoneCall,
  RotateCcw,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import api from '../lib/api';
import { feedback } from '../lib/feedback';

export const getStageKeyForStatus = (status) => {
  const s = String(status || '').toLowerCase().trim();
  if (s.includes('rejected')) return 'rejected';
  if (['pending', 'running', 'red', 'yellow', 'green'].includes(s) || s.includes('assessment')) return 'assessment';
  if (s.includes('1st round')) return 'round1';
  if (s.includes('2nd round')) return 'round2';
  if (s.includes('selected')) return 'selected';
  if (
    s.includes('training') ||
    s.includes('ongoing') ||
    s.includes('completed') ||
    s.includes('ineligible') ||
    s.includes('discontinued') ||
    s.includes('left')
  ) {
    return 'training';
  }
  if (s.includes('joined')) return 'joined';
  return 'daily';
};

export const STAGE_ORDER = ['daily', 'assessment', 'round1', 'round2', 'selected', 'training'];

export const BASE_STAGE_DEFINITIONS = [
  { key: 'daily', label: 'Daily Candidate Notes', shortLabel: 'Daily Candidate', level: 0 },
  { key: 'assessment', label: 'Assessment Notes', shortLabel: 'Assessment', level: 1 },
  { key: 'round1', label: '1st Round Notes', shortLabel: '1st Round', level: 2 },
  { key: 'round2', label: '2nd Round Notes', shortLabel: '2nd Round', level: 3 },
  { key: 'selected', label: 'Selection Notes', shortLabel: 'Selected', level: 4 },
  { key: 'training', label: 'Training Notes', shortLabel: 'Training', level: 5 },
];

export const REJECTION_STAGE_DEF = {
  key: 'rejected',
  label: 'Rejection Reason & Notes',
  shortLabel: 'Rejection',
  level: -1,
  isDanger: true,
};

export const COMMON_REJECTION_REASONS = [
  'Assessment Score Below Criteria',
  'Technical Knowledge Gap',
  'Communication & English Skills',
  'Salary Expectation Mismatch',
  'Relevant Experience Insufficient',
  'Candidate Unreachable / No Show',
  'Candidate Declined / Opted Out',
  'Cultural & Behavioral Fit',
];

export const getCandidateStageLevel = (candidate) => {
  if (!candidate) return 0;
  const status = String(candidate.status || '').toLowerCase().trim();
  const stage = String(candidate.stage || '').toLowerCase().trim();

  if (
    status.includes('training') ||
    status.includes('ongoing') ||
    status.includes('completed') ||
    status.includes('ineligible') ||
    status.includes('left') ||
    status.includes('discontinued') ||
    status.includes('all trainees') ||
    status.includes('joined') ||
    stage.includes('training') ||
    stage.includes('joined')
  ) {
    return 5;
  }
  if (status.includes('selected') || stage.includes('selected')) {
    return 4;
  }
  if (status.includes('2nd round') || stage.includes('2nd round')) {
    return 3;
  }
  if (status.includes('1st round') || stage.includes('1st round')) {
    return 2;
  }
  if (
    ['pending', 'running', 'red', 'yellow', 'green', 'assessment done'].some((k) => status.includes(k)) ||
    stage.includes('assessment') ||
    candidate.assessmentKey ||
    candidate.score !== undefined
  ) {
    return 1;
  }
  return 0;
};

const STAGE_DEFINITIONS = BASE_STAGE_DEFINITIONS;

const formatDateTime = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const CandidateDetailsModal = ({
  candidate,
  open = true,
  inline = false,
  onClose,
  onEdit,
  onDelete,
  onUpdate,
}) => {
  const [copied, setCopied] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [movingRound, setMovingRound] = useState(false);

  const currentCandidateStageKey = getStageKeyForStatus(candidate?.status);
  const [activeNotesStage, setActiveNotesStage] = useState(currentCandidateStageKey);
  const [stageNotes, setStageNotes] = useState({});

  useEffect(() => {
    if (candidate) {
      const currentKey = getStageKeyForStatus(candidate.status);
      const initialStageNotes = { ...(candidate.stageNotes || {}) };
      // Fallback for legacy candidates with comments/remarks but no stageNotes:
      if (!candidate.stageNotes && (candidate.comments || candidate.remarks)) {
        const legacyNote = candidate.comments || candidate.remarks;
        if (currentKey === 'round2') {
          initialStageNotes.round1 = legacyNote;
          initialStageNotes.round2 = '';
        } else if (currentKey === 'round1') {
          initialStageNotes.daily = legacyNote;
          initialStageNotes.round1 = '';
        } else if (currentKey === 'selected' || currentKey === 'training') {
          initialStageNotes.round2 = legacyNote;
        } else {
          initialStageNotes[currentKey] = legacyNote;
        }
      } else if (!initialStageNotes[currentKey] && (candidate.comments || candidate.remarks)) {
        initialStageNotes[currentKey] = candidate.comments || candidate.remarks;
      }
      setStageNotes(initialStageNotes);
      setActiveNotesStage(currentKey);
    }
  }, [candidate?._id, candidate?.status]);

  if ((!open && !inline) || !candidate) return null;

  const candidateEmail = candidate.email ? candidate.email.trim() : '';
  const rawPhone = candidate.phoneNumber ? candidate.phoneNumber.trim() : '';
  const cleanPhone = rawPhone ? rawPhone.replace(/\D/g, '') : '';
  const cvLink = candidate.cvUrl || candidate.resumeUrl || '';

  const activeStageDef =
    STAGE_DEFINITIONS.find((s) => s.key === activeNotesStage) || STAGE_DEFINITIONS[0];
  const currentStageNote = stageNotes[currentCandidateStageKey] || '';

  const previousStagesWithNotes = STAGE_DEFINITIONS.filter(
    (stg) => Boolean((stageNotes[stg.key] || '').trim()) && stg.key !== activeNotesStage
  ).map((stg) => ({
    ...stg,
    note: stageNotes[stg.key],
  }));

  const copyEmail = () => {
    if (!candidateEmail) return;
    navigator.clipboard.writeText(candidateEmail);
    setCopied(true);
    feedback.success('Email copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNoteChange = (text) => {
    setStageNotes((prev) => ({
      ...prev,
      [activeNotesStage]: text,
    }));
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const currentKey = getStageKeyForStatus(candidate.status);
      const updatedStageNotes = { ...stageNotes };
      const currentNote = updatedStageNotes[currentKey] || updatedStageNotes[activeNotesStage] || '';

      const { data } = await api.put(`/api/interviews/${candidate._id}`, {
        ...candidate,
        stageNotes: updatedStageNotes,
        comments: currentNote,
        remarks: currentNote,
      });
      const activeDef = STAGE_DEFINITIONS.find((s) => s.key === activeNotesStage);
      feedback.success(`${activeDef?.shortLabel || 'Stage'} notes saved`);
      if (onUpdate) onUpdate(data);
    } catch {
      feedback.error('Unable to save interview notes');
    } finally {
      setSavingNotes(false);
    }
  };

  // Determine the next pipeline stage based on current status
  const getNextStageInfo = () => {
    const s = String(candidate.status || '').toLowerCase().trim();
    if (
      s.includes('new candidate') ||
      s.includes('interview scheduled') ||
      s.includes('reschedule') ||
      s.includes('no response')
    ) {
      return { label: 'Move to Assessment', nextStatus: 'Pending', nextStage: 'Assessment Update' };
    }
    if (s === 'pending') {
      return { label: 'Start Assessment (Running)', nextStatus: 'Running', nextStage: 'Assessment Update' };
    }
    if (s === 'running') {
      return { label: 'Mark as Green (Passed)', nextStatus: 'Green', nextStage: 'Assessment Update' };
    }
    if (['green', 'yellow', 'red', 'assessment done'].includes(s) || s.includes('assessment')) {
      return { label: 'Move to 1st Round', nextStatus: '1st Round', nextStage: 'Interview Candidate Updates' };
    }
    if (s.includes('1st round')) return { label: 'Move to 2nd Round', nextStatus: '2nd Round', nextStage: 'Interview Candidate Updates' };
    if (s.includes('2nd round')) return { label: 'Select Candidate', nextStatus: 'Selected', nextStage: 'Interview Candidate Updates' };
    if (s.includes('selected')) return { label: 'Enroll in Training', nextStatus: 'Ongoing', nextStage: 'Training Candidates' };
    if (s.includes('ongoing') || s.includes('in training')) return { label: 'Move to Probation', nextStatus: 'Moved to Probation', nextStage: 'Training Candidates' };
    if (s.includes('probation')) return { label: 'Mark as Completed', nextStatus: 'Completed', nextStage: 'Training Candidates' };
    if (s.includes('completed')) return { label: 'Onboard Employee', nextStatus: 'Joined', nextStage: 'Joined Candidates' };
    return { label: 'Move to 1st Round', nextStatus: '1st Round', nextStage: 'Interview Candidate Updates' };
  };

  const handleSetAssessmentStatus = async (newStatus) => {
    try {
      const { data } = await api.put(`/api/interviews/${candidate._id}`, {
        ...candidate,
        status: newStatus,
        stage: 'Assessment Update',
      });
      feedback.success(`Assessment status updated to "${newStatus}"`);
      if (onUpdate) onUpdate(data);
    } catch {
      feedback.error('Failed to update assessment status');
    }
  };

  const nextStage = getNextStageInfo();

  const handleNextRound = async () => {
    setMovingRound(true);
    try {
      const nextKey = getStageKeyForStatus(nextStage.nextStatus);

      // Current stage notes are kept intact!
      const updatedStageNotes = { ...stageNotes };
      // Next stage note starts fresh (or with whatever was previously saved specifically for that next stage)
      const nextStageNote = updatedStageNotes[nextKey] || '';

      const { data } = await api.put(`/api/interviews/${candidate._id}`, {
        ...candidate,
        status: nextStage.nextStatus,
        stage: nextStage.nextStage,
        stageNotes: updatedStageNotes,
        comments: nextStageNote,
        remarks: nextStageNote,
      });
      feedback.success(`Candidate advanced to "${nextStage.nextStatus}"`);
      if (onUpdate) onUpdate(data);
      if (onClose) onClose();
    } catch {
      feedback.error('Failed to advance candidate status');
    } finally {
      setMovingRound(false);
    }
  };

  const handleReject = async () => {
    const inputReason = window.prompt(
      `Please provide the reason why "${candidate.candidateName}" is being rejected:`,
      'Assessment score below criteria'
    );
    if (inputReason === null) return; // cancelled

    const fullReason = inputReason.trim() || 'Assessment score below criteria';
    try {
      const updatedStageNotes = { ...stageNotes, rejected: fullReason };
      const { data } = await api.put(`/api/interviews/${candidate._id}`, {
        ...candidate,
        status: 'Rejected',
        stage: 'Interview Candidate Updates',
        stageNotes: updatedStageNotes,
        comments: `[Rejected at ${candidate.stage || 'Recruitment'}] ${fullReason}`,
        remarks: `[Rejected at ${candidate.stage || 'Recruitment'}] ${fullReason}`,
      });
      feedback.info('Candidate marked as Rejected');
      if (onUpdate) onUpdate(data);
      if (onClose) onClose();
    } catch {
      feedback.error('Failed to update candidate status');
    }
  };

  const handleDownloadCv = () => {
    if (cvLink) {
      window.open(cvLink, '_blank', 'noopener,noreferrer');
      return;
    }
  };

  // Check if personal and professional sections have any defined items
  const hasPersonalInfo = Boolean(
    candidateEmail ||
    rawPhone ||
    candidate.gender?.trim() ||
    candidate.maritalStatus?.trim() ||
    candidate.address?.trim() ||
    candidate.branch?.trim() ||
    candidate.experience?.trim() ||
    candidate.experienceType?.trim() ||
    candidate.createdAt ||
    candidate.entryDate
  );

  const hasProfessionalInfo = Boolean(
    candidate.candidatePost?.trim() ||
    cvLink ||
    candidate.candidateReference?.trim() ||
    candidate.status?.trim() ||
    candidate.interviewScore?.trim() ||
    candidate.reference?.trim() ||
    candidate.interviewDate ||
    candidate.remarks?.trim() ||
    candidate.comments?.trim()
  );

  const modalContent = (
    <div
      className="bg-[#f0f4f8] dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl w-full max-w-4xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
      role="dialog"
      aria-modal="true"
    >
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Candidate Profile Avatar & Name */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-blue-100/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {candidate.candidateName}
            </h2>
            {(candidateEmail || rawPhone) && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex-wrap">
                {candidateEmail && (
                  <div className="flex items-center gap-1">
                    <Mail size={13} className="text-blue-500" />
                    <span>{candidateEmail}</span>
                  </div>
                )}
                {candidateEmail && rawPhone && (
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                )}
                {rawPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-slate-700 dark:text-slate-300" />
                    <span className="font-bold text-slate-900 dark:text-slate-100">{rawPhone}</span>
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Chat on WhatsApp"
                        className="text-emerald-500 hover:text-emerald-600 transition"
                      >
                        <MessageCircle size={14} className="fill-emerald-500 text-white" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons: Edit, Delete, Close */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(candidate)}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold px-3.5 py-1.5 rounded-lg text-xs shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Edit3 size={13} className="text-slate-500" />
              <span>Edit Details</span>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(candidate)}
              className="border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100/80 text-rose-600 dark:text-rose-400 font-semibold px-3.5 py-1.5 rounded-lg text-xs shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg transition cursor-pointer"
              title="Close"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Modal Body Container */}
      <div className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
        {/* Top Row: Personal Information & Professional Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Card: Personal Information */}
          <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-3.5 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <FileText size={15} className="text-blue-500" />
                <span>Personal Information</span>
              </div>

              {hasPersonalInfo ? (
                <div className="space-y-2.5 text-xs">
                  {/* Email */}
                  {candidateEmail && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Email</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{candidateEmail}</span>
                        <button
                          type="button"
                          onClick={copyEmail}
                          title="Copy email"
                          className="text-slate-400 hover:text-blue-600 transition cursor-pointer"
                        >
                          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mobile */}
                  {rawPhone && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Mobile</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{rawPhone}</span>
                        <a href={`tel:${cleanPhone}`} title="Call candidate" className="text-slate-400 hover:text-blue-600">
                          <PhoneCall size={12} />
                        </a>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            title="WhatsApp"
                            className="text-emerald-500 hover:text-emerald-600"
                          >
                            <MessageCircle size={13} className="fill-emerald-500 text-white" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Gender */}
                  {candidate.gender?.trim() && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Gender</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{candidate.gender}</span>
                    </div>
                  )}

                  {/* Marital Status */}
                  {candidate.maritalStatus?.trim() && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Marital Status</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{candidate.maritalStatus}</span>
                    </div>
                  )}

                  {/* Address */}
                  {candidate.address?.trim() && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Address</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{candidate.address}</span>
                    </div>
                  )}

                  {/* Experience */}
                  {candidate.experience?.trim() && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Experience</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{candidate.experience}</span>
                    </div>
                  )}

                  {/* Experience Type */}
                  {candidate.experienceType?.trim() && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Experience Type</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{candidate.experienceType}</span>
                    </div>
                  )}

                  {/* Registered On */}
                  {(candidate.createdAt || candidate.entryDate) && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Registered On</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDateTime(candidate.createdAt || candidate.entryDate)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-3 text-center italic">
                  No personal information specified.
                </div>
              )}
            </div>
          </div>

          {/* Right Card: Professional Details */}
          <div className="bg-white dark:bg-slate-855 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-3.5 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <Briefcase size={15} className="text-blue-500" />
                <span>Professional Details</span>
              </div>

              {hasProfessionalInfo ? (
                <div className="space-y-2.5 text-xs">
                  {/* Designation */}
                  {candidate.candidatePost?.trim() && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Designation</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{candidate.candidatePost}</span>
                    </div>
                  )}

                  {/* CV */}
                  {cvLink && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">CV</span>
                      <a
                        href={cvLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={13} />
                        <span>{candidate.cvFileName || `${(candidate.candidateName || 'resume').toLowerCase().replace(/\s+/g, '_')}.pdf`}</span>
                      </a>
                    </div>
                  )}

                  {/* Source */}
                  {candidate.candidateReference?.trim() && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Source</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{candidate.candidateReference}</span>
                    </div>
                  )}

                  {/* Status */}
                  {candidate.status?.trim() && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">Status</span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {candidate.status}
                        </span>
                      </div>
                      {currentCandidateStageKey === 'assessment' && (
                        <div className="flex items-center justify-end gap-1 flex-wrap pt-0.5">
                          {['Pending', 'Running', 'Red', 'Yellow', 'Green'].map((st) => {
                            const isCurrent = candidate.status?.toLowerCase() === st.toLowerCase();
                            const colorMap = {
                              Pending: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300',
                              Running: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300',
                              Red: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300',
                              Yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300',
                              Green: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300',
                            };
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleSetAssessmentStatus(st)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                                  isCurrent
                                    ? `${colorMap[st]} ring-1 ring-offset-1 ring-slate-400 font-black`
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interview Status / Score */}
                  {candidate.interviewScore?.trim() && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Interview Status</span>
                      <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        {candidate.interviewScore}
                      </span>
                    </div>
                  )}

                  {/* Reference */}
                  {candidate.reference?.trim() && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Reference</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{candidate.reference}</span>
                    </div>
                  )}

                  {/* Interview Date */}
                  {candidate.interviewDate && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Interview Date</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDateTime(candidate.interviewDate)}
                        {candidate.interviewTime ? ` (${candidate.interviewTime})` : ''}
                      </span>
                    </div>
                  )}

                  {/* Remark */}
                  {(currentStageNote || candidate.remarks?.trim() || candidate.comments?.trim()) && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Remark</span>
                      <span
                        className="font-medium text-slate-600 dark:text-slate-400 truncate max-w-[200px]"
                        title={currentStageNote || candidate.remarks || candidate.comments}
                      >
                        {currentStageNote || candidate.remarks || candidate.comments}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-3 text-center italic">
                  No professional details specified.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Interview Notes & Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Interview Notes Card */}
          <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <FileText size={15} className="text-blue-500" />
                <span>{activeStageDef.label}</span>
                {activeNotesStage === currentCandidateStageKey && (
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                    Current Stage
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={savingNotes}
                onClick={handleSaveNotes}
                className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold px-3 py-1 rounded-md text-xs shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                {savingNotes ? 'Saving…' : 'Save Notes'}
              </button>
            </div>

            {/* Stage Selector Tabs with Level-Wise Unlocking */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {(() => {
                const isCandidateRejected =
                  String(candidate.status || '').toLowerCase().includes('rejected') ||
                  Boolean(stageNotes.rejected);
                const currentStageLevel = getCandidateStageLevel(candidate);
                const stageList = isCandidateRejected
                  ? [...BASE_STAGE_DEFINITIONS, REJECTION_STAGE_DEF]
                  : BASE_STAGE_DEFINITIONS;

                return stageList.map((stg) => {
                  const isCurrentCandidateStage = stg.key === currentCandidateStageKey;
                  const isSelectedTab = stg.key === activeNotesStage;
                  const hasNote = Boolean((stageNotes[stg.key] || '').trim());
                  const isLocked =
                    stg.key !== 'rejected' &&
                    stg.level > currentStageLevel &&
                    !hasNote;

                  if (isLocked) {
                    return (
                      <button
                        key={stg.key}
                        type="button"
                        disabled
                        title={`Locked: Candidate has not reached ${stg.shortLabel} yet`}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 opacity-40 cursor-not-allowed bg-transparent text-slate-400 border border-slate-200/50 dark:border-slate-800"
                      >
                        <Lock size={10} className="text-slate-400" />
                        <span>{stg.shortLabel}</span>
                      </button>
                    );
                  }

                  const isDanger = stg.isDanger || stg.key === 'rejected';

                  return (
                    <button
                      key={stg.key}
                      type="button"
                      onClick={() => setActiveNotesStage(stg.key)}
                      style={
                        isSelectedTab
                          ? isDanger
                            ? { backgroundColor: '#e11d48', color: '#ffffff' }
                            : { backgroundColor: 'var(--erp-primary, #2563eb)' }
                          : undefined
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                        isSelectedTab
                          ? isDanger
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-blue-600 text-white shadow-2xs'
                          : isDanger
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100'
                          : hasNote
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-750'
                          : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-slate-200/60 dark:border-slate-800'
                      }`}
                    >
                      <span>{stg.shortLabel}</span>
                      {isCurrentCandidateStage && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                            isSelectedTab ? 'bg-blue-700 text-blue-100' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          Current
                        </span>
                      )}
                      {hasNote && !isSelectedTab && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isDanger ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          title="Has notes"
                        />
                      )}
                    </button>
                  );
                });
              })()}
            </div>

            {/* Rejection Alert Banner if candidate is rejected */}
            {(String(candidate.status || '').toLowerCase().includes('rejected') || Boolean(stageNotes.rejected)) && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2">
                <XCircle size={14} className="text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <span className="font-bold text-rose-700 dark:text-rose-400 text-[11px] uppercase tracking-wider block">
                    Candidate Rejected
                  </span>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300 font-medium leading-relaxed">
                    <strong>Reason / Notes:</strong>{' '}
                    {stageNotes.rejected || candidate.comments || 'No specific rejection reason recorded.'}
                  </p>
                </div>
              </div>
            )}

            {/* Previous Round Notes Preview (if viewing current stage and previous stages have notes) */}
            {previousStagesWithNotes.length > 0 && activeNotesStage === currentCandidateStageKey && (
              <div className="p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-[11px] space-y-1">
                <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider block">
                  Past Stage Notes History:
                </span>
                <div className="space-y-1 max-h-20 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-750">
                  {previousStagesWithNotes.map((pn) => (
                    <div key={pn.key} className="pt-1 first:pt-0 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{pn.shortLabel}: </span>
                      <span className="italic">{pn.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <textarea
              rows={3}
              value={stageNotes[activeNotesStage] || ''}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder={`Add notes for ${activeStageDef.shortLabel} (Shift+Enter for new line)...`}
              className="w-full bg-slate-50/50 dark:bg-slate-800/50 border-l-4 border-l-blue-500 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition resize-y"
            />
          </div>

          {/* Action Buttons Column */}
          <div className="flex flex-col justify-between gap-3">
            {/* Top: Download CV Full Width (ONLY if CV link exists) */}
            {cvLink && (
              <button
                type="button"
                onClick={handleDownloadCv}
                className="w-full border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold py-2.5 rounded-xl text-xs shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download size={14} className="text-slate-600 dark:text-slate-400" />
                <span>Download CV</span>
              </button>
            )}

            {/* Bottom: Move to 1st Round / Next Stage & Reject */}
            <div className="flex items-center gap-2.5 mt-auto">
              <button
                type="button"
                disabled={movingRound}
                onClick={handleNextRound}
                style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={14} />
                <span>{nextStage.label} →</span>
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold py-2.5 px-4 rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <X size={14} />
                <span>Reject</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return <div className="w-full max-w-4xl mx-auto">{modalContent}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {modalContent}
    </div>
  );
};

export default CandidateDetailsModal;
