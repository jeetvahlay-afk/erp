import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  DollarSign,
  Mail,
  Phone,
  Save,
  UserCheck,
  UserRoundCheck,
} from 'lucide-react';
import api from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
  ToolbarButton,
  formatDate,
} from '../components/ui/EnterpriseUI';

const safeText = (value, fallback = 'Not provided') => value || fallback;

const DetailField = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 text-blue-600 flex items-center justify-center shrink-0">
      <Icon size={14} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="text-xs font-semibold text-slate-800 truncate">{safeText(value)}</p>
    </div>
  </div>
);

const WorkflowRow = ({ label, owner, status }) => (
  <div className="flex items-center justify-between p-3.5 bg-slate-50/60 rounded-xl border border-slate-100">
    <div>
      <p className="text-xs font-semibold text-slate-800">{label}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{safeText(owner, 'Not assigned')}</p>
    </div>
    <StatusBadge>{safeText(status, 'Pending')}</StatusBadge>
  </div>
);

const InterviewDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInterview = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get(`/api/interviews/${id}`);
      setInterview(data);
      setRemarks(data.remarks || '');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load candidate information.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInterview();
  }, [loadInterview]);

  const saveRemarks = async () => {
    setSavingRemarks(true);
    try {
      const { data } = await api.put(`/api/interviews/${id}`, {
        ...interview,
        remarks,
      });
      setInterview(data);
      setRemarks(data.remarks || '');
      feedback.success('Candidate remarks saved successfully');
    } catch {
      feedback.error('Unable to save candidate remarks');
    } finally {
      setSavingRemarks(false);
    }
  };

  if (loading) return <LoadingState label="Loading candidate record…" />;
  if (error) return <ErrorState message={error} retry={loadInterview} />;
  if (!interview) {
    return (
      <EmptyState
        title="Candidate not found"
        message="This recruitment record is no longer available."
      />
    );
  }

  const isRemarksChanged = remarks.trim() !== (interview.remarks || '').trim();

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      <PageHeader
        title="Candidate Details"
        breadcrumbs={['Recruitment', 'Candidates', interview.candidateName || 'Candidate']}
        actions={
          <ToolbarButton icon={ArrowLeft} onClick={() => navigate('/manage-interviews')}>
            Back to Candidates
          </ToolbarButton>
        }
      />

      {/* Hero Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-xs">
            {(interview.candidateName || 'C').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900">{interview.candidateName}</h2>
              <StatusBadge>{interview.status || 'New'}</StatusBadge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {safeText(interview.candidatePost, 'Position not assigned')}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <CalendarDays size={12} /> Entered {formatDate(interview.entryDate)}
              </span>
              <span className="flex items-center gap-1">
                <BriefcaseBusiness size={12} /> Recruitment Pipeline
              </span>
            </div>
          </div>
        </div>

        {interview.status === 'Selected' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck size={14} /> Ready for Onboarding
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-4.5">
        {/* Candidate Information */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-4 space-y-3.5">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2.5">
            Contact & Application Info
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailField icon={Mail} label="Email Address" value={interview.email} />
            <DetailField icon={Phone} label="Phone Number" value={interview.phoneNumber} />
            <DetailField
              icon={CalendarDays}
              label="Date of Birth"
              value={interview.candidateDOB ? formatDate(interview.candidateDOB) : null}
            />
            <DetailField icon={UserRoundCheck} label="Reply Status" value={interview.replyStatus} />
            <DetailField
              icon={CalendarDays}
              label="Interview Date"
              value={interview.interviewDate ? formatDate(interview.interviewDate) : null}
            />
            <DetailField icon={Clock3} label="Interview Time" value={interview.interviewTime} />
          </div>
        </div>

        {/* Proposed Compensation */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-4 space-y-3.5">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2.5">
            Proposed Compensation
          </h3>
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <DollarSign size={13} /> Base Salary Structure
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {safeText(interview.salaryStructure, 'Not finalised')}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <DollarSign size={13} /> Incentive Structure
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {safeText(interview.incentiveStructure, 'Not finalised')}
              </p>
            </div>
          </div>
        </div>

        {/* Recruitment Workflow */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Recruitment Workflow Stages
          </h3>
          <div className="space-y-2.5">
            <WorkflowRow
              label="First Interview Round"
              owner={interview.firstRoundBy}
              status={interview.firstMailStatus}
            />
            <WorkflowRow
              label="Second Interview Round"
              owner={interview.secondRoundBy}
              status={interview.finalMailStatus}
            />
            <WorkflowRow
              label="Candidate Response"
              owner={interview.replyStatus}
              status={interview.status}
            />
            <WorkflowRow
              label="Training & Readiness"
              owner={interview.trainingStatus}
              status={interview.trainingStatus}
            />
          </div>
        </div>

        {/* Onboarding Timeline */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Onboarding Timeline
          </h3>
          <div className="space-y-4 pt-1">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Offered Joining Date</p>
                <p className="text-xs font-semibold text-slate-800">
                  {interview.joiningDateProvided ? formatDate(interview.joiningDateProvided) : 'Not provided'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Actual Joining Date</p>
                <p className="text-xs font-semibold text-slate-800">
                  {interview.candidateJoinedOn ? formatDate(interview.candidateJoinedOn) : 'Awaiting confirmation'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Pipeline Stage</p>
                <p className="text-xs font-semibold text-slate-800">{safeText(interview.status, 'Pending')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Remarks & Notes */}
        <div className="lg:col-span-12 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Interviewer Notes & Remarks</h3>
              <p className="text-xs text-slate-500">Evaluation details, technical ratings, and feedback.</p>
            </div>
            {isRemarksChanged && (
              <ToolbarButton primary icon={Save} disabled={savingRemarks} onClick={saveRemarks}>
                {savingRemarks ? 'Saving…' : 'Save Remarks'}
              </ToolbarButton>
            )}
          </div>

          <div className="space-y-3">
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Type candidate evaluation notes, technical score, or interview feedback here..."
              rows={5}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {isRemarksChanged && (
              <p className="text-xs text-amber-600 font-medium">
                You have unsaved changes. Click "Save Remarks" above to save.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewDetails;
