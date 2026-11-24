import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Briefcase,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Eye,
  FileCheck,
  FileText,
  GraduationCap,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  PhoneCall,
  Save,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import api, { getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  StatusBadge,
  ToolbarButton,
  formatDate,
} from '../components/ui/EnterpriseUI';
import {
  getStageKeyForStatus,
  getCandidateStageLevel,
  BASE_STAGE_DEFINITIONS,
  REJECTION_STAGE_DEF,
  COMMON_REJECTION_REASONS,
} from '../components/CandidateDetailsModal';

const STAGE_DEFINITIONS = BASE_STAGE_DEFINITIONS;

const getStatusTone = (status) => {
  const norm = String(status || '').toLowerCase().trim();
  if (norm.includes('new candidate')) return 'info';
  if (norm.includes('interview scheduled') || norm === 'scheduled') return 'primary';
  if (norm.includes('reschedule')) return 'warning';
  if (norm.includes('no response') || norm.includes('no respones')) return 'neutral';
  if (norm === 'pending' || norm.includes('pending')) return 'warning';
  if (norm === 'running' || norm.includes('running')) return 'info';
  if (norm === 'red' || norm.includes('red')) return 'danger';
  if (norm === 'yellow' || norm.includes('yellow')) return 'warning';
  if (norm === 'green' || norm.includes('green')) return 'success';
  if (norm.includes('assessment')) return 'accent';
  if (norm.includes('1st round')) return 'info';
  if (norm.includes('2nd round')) return 'primary';
  if (norm.includes('selected')) return 'success';
  if (norm.includes('rejected')) return 'danger';
  if (norm.includes('probation')) return 'amber';
  if (norm.includes('ongoing') || norm.includes('in training') || norm.includes('training')) return 'primary';
  if (norm.includes('completed') || norm.includes('joined')) return 'success';
  if (norm.includes('ineligible') || norm.includes('left') || norm.includes('discontinued')) return 'danger';
  return 'neutral';
};

const getInitials = (name) => {
  if (!name) return 'C';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const InterviewDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [now] = useState(() => Date.now());

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Contact actions
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Stage notes management
  const [activeNotesStage, setActiveNotesStage] = useState('daily');
  const [stageNotes, setStageNotes] = useState({});
  const [savingNotes, setSavingNotes] = useState(false);
  const [advancingStage, setAdvancingStage] = useState(false);

  // Reject candidate modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Assessment Score Below Criteria');
  const [customRejectionNote, setCustomRejectionNote] = useState('');
  const [savingReject, setSavingReject] = useState(false);
  const [probationDeciding, setProbationDeciding] = useState(false);

  const handleProbationDecision = async (decision) => {
    setProbationDeciding(true);
    try {
      const res = await api.post(`/api/interviews/${interview._id}/probation-decision`, {
        decision,
      });
      setInterview(res.data?.candidate || { ...interview, status: decision === 'probation' ? 'Moved to Probation' : interview.status });
      feedback.success(res.data?.message || 'Decision recorded successfully');
      loadInterview();
    } catch (err) {
      feedback.error(getApiError(err, 'Failed to record probation decision'));
    } finally {
      setProbationDeciding(false);
    }
  };

  const loadInterview = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get(`/api/interviews/${id}`);
      setInterview(data);

      const notesMap = data.stageNotes && typeof data.stageNotes === 'object' ? { ...data.stageNotes } : {};
      const currentStageKey = getStageKeyForStatus(data.status);
      if (!notesMap[currentStageKey] && (data.comments || data.remarks)) {
        notesMap[currentStageKey] = data.comments || data.remarks;
      }
      setStageNotes(notesMap);
      setActiveNotesStage(currentStageKey);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load candidate information.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInterview();
  }, [loadInterview]);

  const copyEmail = () => {
    if (!interview?.email) return;
    navigator.clipboard.writeText(interview.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
    feedback.success('Email copied to clipboard');
  };

  const copyPhone = () => {
    if (!interview?.phoneNumber) return;
    navigator.clipboard.writeText(interview.phoneNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
    feedback.success('Phone number copied to clipboard');
  };

  // Determine the next pipeline stage based on current status
  const getNextStageInfo = () => {
    const s = String(interview?.status || '').toLowerCase().trim();
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
      const { data } = await api.put(`/api/interviews/${interview._id}`, {
        ...interview,
        status: newStatus,
        stage: 'Assessment Update',
      });
      setInterview(data);
      feedback.success(`Assessment status updated to "${newStatus}"`);
    } catch {
      feedback.error('Failed to update assessment status');
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const currentNote = stageNotes[activeNotesStage] || '';
      const updatedStageNotes = {
        ...stageNotes,
        [activeNotesStage]: currentNote,
      };

      const { data } = await api.put(`/api/interviews/${interview._id}`, {
        ...interview,
        stageNotes: updatedStageNotes,
        comments: currentNote,
        remarks: currentNote,
      });

      setInterview(data);
      const activeDef = STAGE_DEFINITIONS.find((s) => s.key === activeNotesStage);
      feedback.success(`${activeDef?.shortLabel || 'Stage'} notes saved`);
    } catch {
      feedback.error('Unable to save interview notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAdvanceStage = async () => {
    const nextStage = getNextStageInfo();
    setAdvancingStage(true);
    try {
      const nextKey = getStageKeyForStatus(nextStage.nextStatus);
      const updatedStageNotes = { ...stageNotes };
      const nextStageNote = updatedStageNotes[nextKey] || '';

      const { data } = await api.put(`/api/interviews/${interview._id}`, {
        ...interview,
        status: nextStage.nextStatus,
        stage: nextStage.nextStage,
        stageNotes: updatedStageNotes,
        comments: nextStageNote,
        remarks: nextStageNote,
      });

      setInterview(data);
      setActiveNotesStage(nextKey);
      feedback.success(`Candidate advanced to "${nextStage.nextStatus}"`);
    } catch {
      feedback.error('Failed to advance candidate status');
    } finally {
      setAdvancingStage(false);
    }
  };

  const handleOpenRejectModal = () => {
    setRejectionReason('Assessment Score Below Criteria');
    setCustomRejectionNote('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    setSavingReject(true);
    try {
      const fullReason = [rejectionReason, customRejectionNote.trim()].filter(Boolean).join(' — ');
      const updatedStageNotes = {
        ...stageNotes,
        rejected: fullReason,
      };

      const { data } = await api.put(`/api/interviews/${interview._id}`, {
        ...interview,
        status: 'Rejected',
        stage: 'Interview Candidate Updates',
        stageNotes: updatedStageNotes,
        comments: `[Rejected at ${interview.stage || 'Recruitment'}] ${fullReason}`,
        remarks: `[Rejected at ${interview.stage || 'Recruitment'}] ${fullReason}`,
      });

      setInterview(data);
      setStageNotes(updatedStageNotes);
      setActiveNotesStage('rejected');
      setRejectModalOpen(false);
      feedback.info(`Candidate marked as Rejected`);
    } catch {
      feedback.error('Failed to update candidate status');
    } finally {
      setSavingReject(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete candidate "${interview.candidateName}"?`)) return;
    try {
      await api.delete(`/api/interviews/${interview._id}`);
      feedback.success('Candidate deleted successfully');
      navigate('/manage-interviews');
    } catch {
      feedback.error('Failed to delete candidate');
    }
  };

  if (loading) return <LoadingState label="Loading candidate profile…" />;
  if (error) return <ErrorState message={error} retry={loadInterview} />;
  if (!interview) {
    return (
      <EmptyState
        title="Candidate not found"
        message="This recruitment record is no longer available."
        action={
          <ToolbarButton icon={ArrowLeft} onClick={() => navigate('/manage-interviews')}>
            Back to Candidates
          </ToolbarButton>
        }
      />
    );
  }

  const cleanPhone = interview.phoneNumber ? String(interview.phoneNumber).replace(/[^0-9+]/g, '') : '';
  const nextStage = getNextStageInfo();

  const trainingStart =
    interview?.trainingStartDate ||
    interview?.candidateJoinedOn ||
    interview?.joiningDateProvided ||
    interview?.entryDate;
  const isTrainingStage =
    String(interview?.stage || '').toLowerCase().includes('training') ||
    String(interview?.status || '').toLowerCase().includes('training') ||
    String(interview?.status || '').toLowerCase().includes('ongoing');
  const isProbationStatus = String(interview?.status || '').toLowerCase().includes('probation');
  const daysInTraining = trainingStart
    ? Math.max(0, Math.floor((now - new Date(trainingStart).getTime()) / (24 * 60 * 60 * 1000)))
    : 0;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-16">
      {/* ========================================================================= */}
      {/* 1. RECRUITMENT CANDIDATE DOSSIER HERO BANNER                              */}
      {/* Purpose-built for Recruitment & Talent Acquisition, distinct from Employee */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 sm:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Candidate Dossier Identity Badge */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg ring-4 ring-blue-50 dark:ring-blue-950/50 shrink-0">
              {getInitials(interview.candidateName)}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Talent Dossier
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {interview.candidateName}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    const cCode = interview.candidateCode || interview.candidateReference;
                    if (cCode) {
                      navigator.clipboard.writeText(cCode);
                      feedback.success(`Candidate ID copied: ${cCode}`);
                    }
                  }}
                  title="Copy Candidate ID"
                  className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 hover:bg-blue-100 transition cursor-pointer"
                >
                  <span>{interview.candidateCode || interview.candidateReference || 'WK-CANDIDATE'}</span>
                  <Copy size={11} className="text-blue-500" />
                </button>
                <StatusBadge tone={getStatusTone(interview.status)}>
                  {interview.status}
                </StatusBadge>
              </div>

              <div className="flex items-center gap-3.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Briefcase size={14} className="text-blue-500" />
                  {interview.candidatePost || 'Applied Position'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                  <Building size={14} className="text-slate-400" />
                  {interview.department || 'Technology'} ({interview.branch || 'Ahmedabad Drive'})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  Registered {formatDate(interview.entryDate || interview.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Recruiter Command Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <button
              type="button"
              onClick={() => navigate('/manage-interviews')}
              className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <ArrowLeft size={14} className="text-slate-500" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/edit-candidate/${interview._id}`)}
              className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <Edit3 size={14} />
              <span>Edit Candidate</span>
            </button>

            {interview.status !== 'Rejected' && (
              <button
                type="button"
                onClick={handleOpenRejectModal}
                className="border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl px-3.5 py-2.5 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <XCircle size={14} />
                <span>Reject</span>
              </button>
            )}

            {interview.status !== 'Rejected' && interview.status !== 'Completed' && interview.status !== 'Joined' && (
              <button
                type="button"
                disabled={advancingStage}
                onClick={handleAdvanceStage}
                style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <CheckCircle2 size={14} />
                <span>{advancingStage ? 'Advancing…' : `${nextStage.label} →`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDelete}
              className="border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2.5 rounded-xl transition cursor-pointer"
              title="Delete candidate"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* 8-Day Training Milestone Decision Banner */}
        {isTrainingStage && daysInTraining >= 8 && !isProbationStatus && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-400 dark:border-amber-600 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase tracking-wider">
                  Training Milestone: 8 Days Completed
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                  {daysInTraining} Days in Training
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                this <span className="text-amber-600 dark:text-amber-400 font-bold">{interview.candidateName}</span> candidate completed the 8 days of the training period do you want to move him/her into probation period or not
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={probationDeciding}
                onClick={() => handleProbationDecision('probation')}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>Move to Probation Period</span>
              </button>
              <button
                type="button"
                disabled={probationDeciding}
                onClick={() => handleProbationDecision('extend')}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Keep in Training
              </button>
            </div>
          </div>
        )}

        {/* Candidate in Probation Notification & Direct Employee Link */}
        {isProbationStatus && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-300 dark:border-amber-700/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Candidate Active in 3-Month Probation Period
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Converted into employee record with &apos;Probation&apos; status. Eligible for official employee conversion after 3 months.
                </p>
              </div>
            </div>
            {interview.convertedUserId && (
              <button
                type="button"
                onClick={() => navigate(`/employee/${interview.convertedUserId}`)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <span>View Employee Profile</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. RECRUITMENT PIPELINE VISUAL STEPPER                                    */}
        {/* Shows candidate's journey from Registration to Onboarding                  */}
        {/* ========================================================================= */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              Recruitment Pipeline Journey
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Current Stage: <strong className="text-blue-600 dark:text-blue-400">{interview.stage || 'Daily Candidates'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { key: 'daily', label: '1. Registration', level: 0 },
              { key: 'assessment', label: '2. Assessment', level: 1 },
              { key: 'round1', label: '3. 1st Round', level: 2 },
              { key: 'round2', label: '4. 2nd Round', level: 3 },
              { key: 'selected', label: '5. Selected', level: 4 },
              { key: 'training', label: '6. Training', level: 5 },
            ].map((step) => {
              const currentLevel = getCandidateStageLevel(interview);
              const isRejected = String(interview.status || '').toLowerCase().includes('rejected');
              const isPast = step.level < currentLevel;
              const isCurrent = step.level === currentLevel;
              const isLocked = step.level > currentLevel && !stageNotes[step.key]?.trim();
              const isRejectedHere = isRejected && step.level === currentLevel;

              return (
                <button
                  key={step.key}
                  type="button"
                  disabled={isLocked}
                  onClick={() => !isLocked && setActiveNotesStage(step.key)}
                  className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                    isRejectedHere
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                      : isCurrent
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/30'
                      : isPast
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 cursor-pointer hover:bg-emerald-100/60'
                      : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold truncate">{step.label}</span>
                    {isRejectedHere ? (
                      <XCircle size={15} className="text-rose-600 shrink-0" />
                    ) : isPast ? (
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    ) : isCurrent ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping shrink-0" />
                    ) : (
                      <Lock size={12} className="text-slate-400 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold">
                    {isRejectedHere
                      ? 'Rejected'
                      : isCurrent
                      ? 'Active Round'
                      : isPast
                      ? 'Completed'
                      : 'Locked'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE: 2-COLUMN RECRUITMENT ATS LAYOUT                        */}
      {/* Left: Assessment & Dossier | Right: Stage Notes & Interview Evaluation     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= LEFT COLUMN: Assessment & Dossier ================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Online Assessment & Proctoring Evaluation */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Award size={16} />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Assessment Scorecard
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Online 30 MCQ test results</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                interview.status === 'Green'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : interview.status === 'Yellow'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : interview.status === 'Red'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {interview.status || 'Pending'}
              </span>
            </div>

            {/* Scorecard Hero Display */}
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Evaluation Score</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    {interview.interviewScore && interview.interviewScore !== 'Pending'
                      ? String(interview.interviewScore).replace(/\s*\(\d+%\)/g, '')
                      : 'Pending Exam'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-medium">Proctor Flags</span>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 justify-end">
                    <CheckCircle2 size={13} />
                    <span>0 Tab Switches</span>
                  </div>
                </div>
              </div>

              {/* Assessment Status Selector Chips */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Update Assessment Rating:
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {['Pending', 'Running', 'Red', 'Yellow', 'Green'].map((st) => {
                    const isCurrent = interview.status?.toLowerCase() === st.toLowerCase();
                    const toneClasses = {
                      Pending: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300',
                      Running: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300',
                      Red: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300',
                      Yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300',
                      Green: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300',
                    }[st];
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleSetAssessmentStatus(st)}
                        className={`text-[11px] font-bold py-1 rounded-lg border text-center transition cursor-pointer ${
                          isCurrent
                            ? `${toneClasses} ring-2 ring-slate-400 shadow-xs font-black`
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Resume & Attached Documents */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <FileText size={16} />
                </span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Resume / CV Document
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {interview.cvUrl ? '1 Attached' : 'None'}
              </span>
            </div>

            {interview.cvUrl ? (
              <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/50 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2.5">
                  <FileCheck size={20} className="text-purple-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {interview.cvUrl.split('/').pop() || 'Candidate_Resume.pdf'}
                    </p>
                    <p className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                      Uploaded candidate resume
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={interview.cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                    title="View Resume in new tab"
                  >
                    <Eye size={13} />
                    <span>View</span>
                  </a>
                  <a
                    href={interview.cvUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                    title="Download Resume"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                No resume link or document uploaded yet.
              </div>
            )}
          </div>

          {/* Card 3: Academic Background & Candidate Qualification */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="grid size-7 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <GraduationCap size={16} />
              </span>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Qualifications & Academic Details
              </h3>
            </div>

            <div className="space-y-3 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Degree / Course</span>
                <span className="font-bold text-slate-900 dark:text-white">{interview.course || '—'}</span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">College / University</span>
                <span className="font-bold text-slate-900 dark:text-white text-right max-w-[220px] truncate">
                  {interview.college || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Experience Level</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {interview.experience || 'Fresher'} {interview.experienceType ? `(${interview.experienceType})` : ''}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Current Location</span>
                <span className="font-bold text-slate-900 dark:text-white">{interview.currentLocation || '—'}</span>
              </div>

              <div className="flex items-start justify-between pt-2.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Full Address</span>
                <span className="font-semibold text-slate-900 dark:text-white text-right max-w-[200px]">
                  {interview.address || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Gender & Status</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {[interview.gender, interview.maritalStatus].filter(Boolean).join(' • ') || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Recruiter Quick Connect */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>Recruiter Quick Connect</span>
              <span className="text-[10px] text-slate-400 font-normal">Direct Outreach</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {cleanPhone ? (
                <a
                  href={`tel:${cleanPhone}`}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-xs transition border border-blue-200/80 dark:border-blue-900/60 shadow-2xs active:scale-95"
                  title="Call candidate"
                >
                  <PhoneCall size={18} className="mb-1 text-blue-600" />
                  <span>Call</span>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 text-slate-400 opacity-50">
                  <Phone size={18} className="mb-1" />
                  <span>Call</span>
                </div>
              )}

              {cleanPhone ? (
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    `Hello ${interview.candidateName}, this is regarding your application for the ${interview.candidatePost || 'role'} at Vahlay Consulting.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition border border-emerald-200/80 dark:border-emerald-900/60 shadow-2xs active:scale-95"
                  title="Message on WhatsApp"
                >
                  <MessageCircle size={18} className="mb-1 fill-emerald-500 text-white" />
                  <span>WhatsApp</span>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 text-slate-400 opacity-50">
                  <MessageCircle size={18} className="mb-1" />
                  <span>WhatsApp</span>
                </div>
              )}

              {interview.email ? (
                <a
                  href={`mailto:${interview.email}?subject=${encodeURIComponent(
                    `Interview Update: ${interview.candidateName} (${interview.candidateCode || 'Candidate'})`
                  )}`}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-violet-50/70 hover:bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-bold text-xs transition border border-violet-200/80 dark:border-violet-900/60 shadow-2xs active:scale-95"
                  title="Send Email"
                >
                  <Mail size={18} className="mb-1 text-violet-600" />
                  <span>Email</span>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 text-slate-400 opacity-50">
                  <Mail size={18} className="mb-1" />
                  <span>Email</span>
                </div>
              )}
            </div>

            {/* Quick Copy Contact Bar */}
            <div className="pt-2 space-y-1 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span className="truncate">{interview.email || 'No email'}</span>
                {interview.email && (
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="hover:text-blue-600 p-1 cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                  >
                    {copiedEmail ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              {interview.phoneNumber && (
                <div className="flex items-center justify-between">
                  <span className="truncate">{interview.phoneNumber}</span>
                  <button
                    type="button"
                    onClick={copyPhone}
                    className="hover:text-blue-600 p-1 cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                  >
                    {copiedPhone ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Stage Notes & Evaluation ================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Stage-Wise Notes & Historical Notes Panel */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  <span>Interviewer Evaluation & Stage Notes</span>
                </h3>
              </div>

              <button
                type="button"
                disabled={savingNotes}
                onClick={handleSaveNotes}
                style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <Save size={14} />
                <span>{savingNotes ? 'Saving…' : 'Save Notes'}</span>
              </button>
            </div>

            {/* Segmented Stage Note Tabs with Level-Wise Unlocking */}
            <div className="px-4 sm:px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {(() => {
                const isCandidateRejected =
                  String(interview.status || '').toLowerCase().includes('rejected') ||
                  Boolean(stageNotes.rejected);
                const currentStageLevel = getCandidateStageLevel(interview);
                const stageList = isCandidateRejected
                  ? [...BASE_STAGE_DEFINITIONS, REJECTION_STAGE_DEF]
                  : BASE_STAGE_DEFINITIONS;

                return stageList.map((stage) => {
                  const isActive = activeNotesStage === stage.key;
                  const hasExistingNote = Boolean(stageNotes[stage.key]?.trim());
                  const isLocked =
                    stage.key !== 'rejected' &&
                    stage.level > currentStageLevel &&
                    !hasExistingNote;

                  if (isLocked) {
                    return (
                      <button
                        key={stage.key}
                        type="button"
                        disabled
                        title={`Locked: Candidate has not reached ${stage.shortLabel} yet`}
                        className="px-3.5 py-2 text-xs font-semibold rounded-t-xl transition shrink-0 border-b-2 border-transparent text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed flex items-center gap-1.5"
                      >
                        <Lock size={12} className="text-slate-400 dark:text-slate-500" />
                        <span>{stage.shortLabel}</span>
                      </button>
                    );
                  }

                  const isDangerTab = stage.isDanger || stage.key === 'rejected';

                  return (
                    <button
                      key={stage.key}
                      type="button"
                      onClick={() => setActiveNotesStage(stage.key)}
                      style={
                        isActive
                          ? isDangerTab
                            ? { borderColor: '#e11d48', color: '#e11d48', backgroundColor: 'rgba(244, 63, 94, 0.08)' }
                            : {
                                borderColor: 'var(--erp-primary, #2563eb)',
                                color: 'var(--erp-primary, #2563eb)',
                                backgroundColor:
                                  'color-mix(in srgb, var(--erp-primary, #2563eb) 8%, transparent)',
                              }
                          : undefined
                      }
                      className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 border-b-2 ${
                        isActive
                          ? isDangerTab
                            ? 'border-rose-600 text-rose-600 bg-rose-50/50 dark:bg-rose-950/30'
                            : 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                          : isDangerTab
                          ? 'border-transparent text-rose-500 hover:text-rose-700'
                          : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{stage.shortLabel}</span>
                      {hasExistingNote && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isDangerTab ? 'bg-rose-500' : 'bg-blue-500'
                          }`}
                          title="Has notes"
                        />
                      )}
                    </button>
                  );
                });
              })()}
            </div>

            {/* Active Stage Textarea */}
            <div className="p-4 sm:p-5 space-y-3.5">
              {/* Rejection Alert Banner if candidate is rejected */}
              {(String(interview.status || '').toLowerCase().includes('rejected') || Boolean(stageNotes.rejected)) && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase tracking-wider text-rose-700 dark:text-rose-400">
                        Candidate Rejected
                      </span>
                      <span className="text-[10px] bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 px-2.5 py-0.5 rounded-full font-bold">
                        Stage: {interview.stage || 'Interview Updates'}
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed font-medium">
                      <strong>Rejection Reason / Notes:</strong>{' '}
                      {stageNotes.rejected || interview.comments || 'No specific rejection notes recorded.'}
                    </p>
                  </div>
                </div>
              )}

              {(() => {
                const isCandidateRejected =
                  String(interview.status || '').toLowerCase().includes('rejected') ||
                  Boolean(stageNotes.rejected);
                const currentStageLevel = getCandidateStageLevel(interview);
                const stageList = isCandidateRejected
                  ? [...BASE_STAGE_DEFINITIONS, REJECTION_STAGE_DEF]
                  : BASE_STAGE_DEFINITIONS;
                const activeDef =
                  stageList.find((s) => s.key === activeNotesStage) || stageList[0];
                const activeStageIsLocked =
                  activeDef.key !== 'rejected' &&
                  activeDef.level > currentStageLevel &&
                  !stageNotes[activeDef.key]?.trim();
                const priorHistoricalStages = stageList.filter(
                  (def) => def.key !== activeNotesStage && Boolean(stageNotes[def.key]?.trim())
                );

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>{activeDef?.label || 'Interviewer Notes'}</span>
                        {activeDef.key === 'rejected' && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-950 px-2.5 py-0.5 rounded-full">
                            Rejection Feedback
                          </span>
                        )}
                      </label>
                    </div>

                    {activeStageIsLocked ? (
                      <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2">
                        <Lock className="w-6 h-6 text-slate-400 mx-auto" />
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {activeDef?.label || 'Stage'} is Currently Locked
                        </div>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                          Candidate has not reached this round yet. Notes will unlock automatically once candidate advances.
                        </p>
                      </div>
                    ) : (
                      <textarea
                        rows={4}
                        value={stageNotes[activeNotesStage] || ''}
                        onChange={(e) =>
                          setStageNotes({
                            ...stageNotes,
                            [activeNotesStage]: e.target.value,
                          })
                        }
                        placeholder={
                          activeNotesStage === 'rejected'
                            ? 'Record detailed reasons why candidate was rejected, interviewer observations, or feedback...'
                            : `Enter detailed evaluation, feedback, questions asked, or observations for ${activeDef?.shortLabel || 'this stage'}...`
                        }
                        className="w-full bg-slate-50/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-y font-normal"
                      />
                    )}

                    {/* Historical Notes Overview (Excludes current active stage to prevent repeated data!) */}
                    {priorHistoricalStages.length > 0 && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                          Previous Stages History
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {priorHistoricalStages.map((def) => {
                            const text = stageNotes[def.key]?.trim();
                            if (!text) return null;
                            const isDanger = def.key === 'rejected';
                            return (
                              <div
                                key={def.key}
                                onClick={() => setActiveNotesStage(def.key)}
                                className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition ${
                                  isDanger
                                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                                }`}
                              >
                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between mb-1.5">
                                  <span className={isDanger ? 'text-rose-700 dark:text-rose-400' : ''}>
                                    {def.shortLabel}
                                  </span>
                                  <span
                                    style={{ color: isDanger ? '#e11d48' : 'var(--erp-primary, #2563eb)' }}
                                    className="text-[10px] font-bold"
                                  >
                                    View / Edit
                                  </span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 line-clamp-2 text-[11px] leading-relaxed">
                                  {text}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Interview Scheduling & Recruiter Remarks Card */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Calendar size={15} className="text-blue-500" />
              <span>Interview Schedule & Logistics</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Scheduled Date</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {interview.interviewDate ? formatDate(interview.interviewDate) : 'Not scheduled'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Scheduled Time</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {interview.interviewTime || 'Pending'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">1st Round Interviewer</span>
                  <span className="font-bold text-slate-900 dark:text-white">{interview.firstRoundBy || 'Pending'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">2nd Round Interviewer</span>
                  <span className="font-bold text-slate-900 dark:text-white">{interview.secondRoundBy || 'Pending'}</span>
                </div>
              </div>
            </div>

            {/* Comments & General Feedback */}
            {(interview.comments || interview.remarks) && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  General Remarks & Recruiter Comments
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                  {interview.comments || interview.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Workflow Stage Progression Action Bar */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between flex-wrap gap-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Status:</span>
              <StatusBadge status={interview.status} />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {interview.status !== 'Rejected' && (
                <button
                  type="button"
                  onClick={handleOpenRejectModal}
                  className="border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-600 rounded-xl px-4 py-2.5 text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  Reject Candidate
                </button>
              )}

              {interview.status !== 'Rejected' && interview.status !== 'Completed' && interview.status !== 'Joined' && (
                <button
                  type="button"
                  disabled={advancingStage}
                  onClick={handleAdvanceStage}
                  style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition"
                >
                  <CheckCircle2 size={15} />
                  <span>{advancingStage ? 'Advancing…' : `${nextStage.label} →`}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Reject Candidate Reason & Notes Modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={`Reject Candidate: ${interview?.candidateName}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Please specify why this candidate is being marked as Rejected. This will be preserved in their stage notes and recruitment record.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Primary Reason
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_REJECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                    rejectionReason === reason
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Detailed Rejection Reason &amp; Notes
            </label>
            <textarea
              rows={3}
              value={customRejectionNote}
              onChange={(e) => setCustomRejectionNote(e.target.value)}
              placeholder="Enter rejection reason and evaluation notes..."
              className="w-full bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition resize-y font-normal"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <ToolbarButton
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
            >
              Cancel
            </ToolbarButton>
            <button
              type="button"
              disabled={savingReject}
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <XCircle size={14} />
              <span>{savingReject ? 'Rejecting…' : 'Confirm Rejection'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InterviewDetails;