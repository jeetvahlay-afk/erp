import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  ExternalLink,
  FileText,
  GraduationCap,
  Save,
  User,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  ErrorState,
  LoadingState,
  PageHeader,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const BRANCH_OPTIONS = [
  'Ahmedabad',
  'Ahmedabad Drive',
  'Vadodara',
  'Surat',
  'Gandhinagar',
  'Rajkot',
  'Mumbai',
  'Pune',
  'Bangalore',
  'Delhi NCR',
  'Remote',
];

const STAGE_OPTIONS = [
  'Daily Candidates Update',
  'Daily Candidate Update',
  'Assessment Update',
  'Interview Candidate Updates',
  'Training Candidates',
  'Joined Candidates',
];

const STATUS_GROUPS = [
  {
    label: 'Daily Candidate Stage',
    options: ['New candidates info', 'Interview Scheduled', 'Rescheduled', 'No Response'],
  },
  {
    label: 'Assessment Stage',
    options: ['Pending', 'Running', 'Red', 'Yellow', 'Green', 'Assessment Done'],
  },
  {
    label: 'Interview Rounds',
    options: ['1st Round', '2nd Round', 'Selected', 'Rejected'],
  },
  {
    label: 'Training Stage',
    options: ['Ongoing', 'Completed', 'Ineligible', 'Left', 'Discontinued', 'Joined'],
  },
];

const blankCandidate = {
  candidateName: '',
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  gender: '',
  maritalStatus: '',
  candidateDOB: '',
  currentLocation: '',
  address: '',
  branch: 'Ahmedabad',
  department: 'Technology',
  candidatePost: 'Fullstack Developer',
  candidateReference: '',
  candidateCode: '',
  candidateType: 'Fresher',
  experience: 'Fresher',
  experienceType: 'Fresher',
  course: '',
  college: '',
  cvUrl: '',
  stage: 'Daily Candidates Update',
  status: 'New candidates info',
  interviewScore: '',
  interviewDate: '',
  interviewTime: '10:00 AM',
  firstRoundBy: '',
  secondRoundBy: '',
  trainingStatus: '',
  reference: '',
  comments: '',
  remarks: '',
  stageNotes: {
    daily: '',
    assessment: '',
    round1: '',
    round2: '',
    selected: '',
    training: '',
    rejected: '',
  },
};

const dateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const tabs = [
  { id: 'basic', label: 'Basic Information', icon: User },
  { id: 'recruitment', label: 'Recruitment & Pipeline', icon: Briefcase },
  { id: 'education', label: 'Education & Experience', icon: GraduationCap },
  { id: 'notes', label: 'Resume & Stage Notes', icon: FileText },
];

const EditCandidate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [tab, setTab] = useState('basic');
  const [form, setForm] = useState(blankCandidate);
  const [departments, setDepartments] = useState([]);
  const [state, setState] = useState({ loading: true, saving: false, error: '' });

  const load = async () => {
    setState({ loading: true, saving: false, error: '' });
    try {
      const [candidateResponse, departmentResponse] = await Promise.all([
        api.get(`/api/interviews/${id}`),
        api.get('/api/departments'),
      ]);
      const candidate = candidateResponse.data || {};

      const fullName = (candidate.candidateName || '').trim();
      const nameParts = fullName ? fullName.split(/\s+/) : [];
      const derivedFirstName = nameParts[0] || '';
      const derivedLastName = nameParts.slice(1).join(' ') || '';

      const notes = candidate.stageNotes || {};

      setForm({
        ...blankCandidate,
        ...candidate,
        firstName: derivedFirstName,
        lastName: derivedLastName,
        candidateName: fullName,
        candidateDOB: dateInput(candidate.candidateDOB),
        interviewDate: dateInput(candidate.interviewDate),
        entryDate: dateInput(candidate.entryDate || candidate.createdAt),
        branch: candidate.branch || 'Ahmedabad',
        department: candidate.department || 'Technology',
        candidatePost: candidate.candidatePost || candidate.positionAppliedFor || 'Fullstack Developer',
        stage: candidate.stage || 'Daily Candidates Update',
        status: candidate.status || 'New candidates info',
        stageNotes: {
          daily: notes.daily || '',
          assessment: notes.assessment || '',
          round1: notes.round1 || '',
          round2: notes.round2 || '',
          selected: notes.selected || '',
          training: notes.training || '',
          rejected: notes.rejected || '',
        },
      });

      setDepartments(asArray(departmentResponse.data));
      setState({ loading: false, saving: false, error: '' });
    } catch (error) {
      setState({
        loading: false,
        saving: false,
        error: getApiError(error, 'Unable to load candidate details'),
      });
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const setField = (name, value) => {
    setForm((current) => {
      const updated = { ...current, [name]: value };
      if (name === 'firstName' || name === 'lastName') {
        const f = name === 'firstName' ? value : current.firstName;
        const l = name === 'lastName' ? value : current.lastName;
        updated.candidateName = `${f} ${l}`.trim();
      }
      return updated;
    });
  };

  const setStageNote = (stageKey, noteValue) => {
    setForm((current) => ({
      ...current,
      stageNotes: {
        ...(current.stageNotes || {}),
        [stageKey]: noteValue,
      },
    }));
  };

  const submit = async () => {
    const candidateName = form.candidateName.trim() || `${form.firstName} ${form.lastName}`.trim();
    if (!candidateName) {
      feedback.error('Candidate full name is required.');
      return;
    }
    if (!form.phoneNumber.trim()) {
      feedback.error('Phone number is required.');
      return;
    }
    if (!form.candidatePost.trim()) {
      feedback.error('Applied position is required.');
      return;
    }

    setState((current) => ({ ...current, saving: true }));
    try {
      const payload = {
        ...form,
        candidateName,
        remarks: form.comments || form.remarks || '',
        comments: form.comments || form.remarks || '',
      };

      await api.put(`/api/interviews/${id}`, payload);
      feedback.success('Candidate profile updated successfully.');
      navigate(`/interview/${id}`);
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to update candidate profile'));
    } finally {
      setState((current) => ({ ...current, saving: false }));
    }
  };

  if (state.loading) return <LoadingState label="Loading candidate record…" />;
  if (state.error) return <ErrorState message={state.error} retry={load} />;

  const inputClass =
    'w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors';
  const labelClass = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="Edit Candidate"
        breadcrumbs={[
          'Recruitment Management',
          'Candidate Updates',
          form.candidateName || 'Candidate',
          'Edit',
        ]}
        actions={
          <>
            <ToolbarButton icon={ArrowLeft} onClick={() => navigate(`/interview/${id}`)}>
              Back
            </ToolbarButton>
            <ToolbarButton
              primary
              icon={Save}
              disabled={state.saving}
              onClick={submit}
            >
              {state.saving ? 'Saving…' : 'Save Changes'}
            </ToolbarButton>
          </>
        }
      />

      {/* 2. Navigation Tab Bar */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-1.5 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={isActive ? { backgroundColor: 'var(--erp-primary, #2563eb)' } : undefined}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={14} />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Form Content Card */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 sm:p-7">
        {/* ========================================================================= */}
        {/* TAB 1: BASIC INFORMATION                                                  */}
        {/* ========================================================================= */}
        {tab === 'basic' && (
          <div className="space-y-8">
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Personal Information</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Individual identity and direct contact details.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    value={form.firstName}
                    onChange={(e) => setField('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    value={form.lastName}
                    onChange={(e) => setField('lastName', e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="e.g. candidate@example.com"
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    className={inputClass}
                    value={form.phoneNumber}
                    onChange={(e) => setField('phoneNumber', e.target.value)}
                    placeholder="e.g. +91 9876543210"
                  />
                </div>

                <div>
                  <label className={labelClass}>Gender</label>
                  <select
                    className={inputClass}
                    value={form.gender}
                    onChange={(e) => setField('gender', e.target.value)}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Marital Status</label>
                  <select
                    className={inputClass}
                    value={form.maritalStatus}
                    onChange={(e) => setField('maritalStatus', e.target.value)}
                  >
                    <option value="">Select Marital Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Current City / Location</label>
                  <input
                    className={inputClass}
                    value={form.currentLocation}
                    onChange={(e) => setField('currentLocation', e.target.value)}
                    placeholder="e.g. Ahmedabad, Gujarat"
                  />
                </div>

                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.candidateDOB}
                    onChange={(e) => setField('candidateDOB', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Current Residential Address</label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                    placeholder="Enter full street address, apartment, or residential area..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: RECRUITMENT & PIPELINE                                             */}
        {/* ========================================================================= */}
        {tab === 'recruitment' && (
          <div className="space-y-8">
            {/* Position & Branch Details */}
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Position & Department</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hiring role, department alignment, and designated branch location.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Applied Role / Post <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    value={form.candidatePost}
                    onChange={(e) => setField('candidatePost', e.target.value)}
                    placeholder="e.g. Fullstack Developer"
                  />
                </div>

                <div>
                  <label className={labelClass}>Department</label>
                  <select
                    className={inputClass}
                    value={form.department}
                    onChange={(e) => setField('department', e.target.value)}
                  >
                    {departments.length > 0 ? (
                      departments.map((d) => (
                        <option key={d._id || d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Technology">Technology</option>
                        <option value="Operations">Operations</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Sales">Sales</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Finance">Finance</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Branch Location <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className={inputClass}
                    value={form.branch}
                    onChange={(e) => setField('branch', e.target.value)}
                  >
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Source / Candidate Reference</label>
                  <input
                    className={inputClass}
                    value={form.candidateReference}
                    onChange={(e) => setField('candidateReference', e.target.value)}
                    placeholder="e.g. Walk-in, LinkedIn, Campus Drive"
                  />
                </div>

                <div>
                  <label className={labelClass}>Candidate ID / Reference Code</label>
                  <input
                    className={inputClass}
                    value={form.candidateCode || form.reference}
                    onChange={(e) => {
                      setField('candidateCode', e.target.value);
                      setField('reference', e.target.value);
                    }}
                    placeholder="e.g. WK-00109"
                  />
                </div>

                <div>
                  <label className={labelClass}>Registration / Entry Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.entryDate}
                    onChange={(e) => setField('entryDate', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Pipeline Stage & Status */}
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pipeline Stage & Schedule</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Recruitment pipeline progression, interview evaluation score, and schedule.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Recruitment Stage</label>
                  <select
                    className={inputClass}
                    value={form.stage}
                    onChange={(e) => setField('stage', e.target.value)}
                  >
                    {STAGE_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Pipeline Status</label>
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) => setField('status', e.target.value)}
                  >
                    {STATUS_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Evaluation Score / Rating</label>
                  <input
                    className={inputClass}
                    value={form.interviewScore}
                    onChange={(e) => setField('interviewScore', e.target.value)}
                    placeholder="e.g. 8/30 · Red"
                  />
                </div>

                <div>
                  <label className={labelClass}>Scheduled Interview Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.interviewDate}
                    onChange={(e) => setField('interviewDate', e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass}>Scheduled Interview Time</label>
                  <input
                    className={inputClass}
                    value={form.interviewTime}
                    onChange={(e) => setField('interviewTime', e.target.value)}
                    placeholder="e.g. 10:00 AM"
                  />
                </div>

                <div>
                  <label className={labelClass}>1st Round Conducted By</label>
                  <input
                    className={inputClass}
                    value={form.firstRoundBy}
                    onChange={(e) => setField('firstRoundBy', e.target.value)}
                    placeholder="Interviewer name"
                  />
                </div>

                <div>
                  <label className={labelClass}>2nd Round Conducted By</label>
                  <input
                    className={inputClass}
                    value={form.secondRoundBy}
                    onChange={(e) => setField('secondRoundBy', e.target.value)}
                    placeholder="Interviewer name"
                  />
                </div>

                <div>
                  <label className={labelClass}>Training Status</label>
                  <input
                    className={inputClass}
                    value={form.trainingStatus}
                    onChange={(e) => setField('trainingStatus', e.target.value)}
                    placeholder="e.g. Active, Completed"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: EDUCATION & EXPERIENCE                                             */}
        {/* ========================================================================= */}
        {tab === 'education' && (
          <div className="space-y-8">
            {/* Academic Background */}
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Academic Qualifications</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Highest degree, university or institute name, and academic credentials.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Degree / Course</label>
                  <input
                    className={inputClass}
                    value={form.course}
                    onChange={(e) => setField('course', e.target.value)}
                    placeholder="e.g. B.Tech Computer Engineering"
                  />
                </div>

                <div>
                  <label className={labelClass}>College / University</label>
                  <input
                    className={inputClass}
                    value={form.college}
                    onChange={(e) => setField('college', e.target.value)}
                    placeholder="e.g. Gujarat Technological University"
                  />
                </div>
              </div>
            </div>

            {/* Work Experience */}
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Work Experience</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Professional track record, experience level, and tenure.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Experience Level</label>
                  <input
                    className={inputClass}
                    value={form.experience}
                    onChange={(e) => setField('experience', e.target.value)}
                    placeholder="e.g. Fresher, 1.5 Years"
                  />
                </div>

                <div>
                  <label className={labelClass}>Experience Type</label>
                  <select
                    className={inputClass}
                    value={form.experienceType}
                    onChange={(e) => setField('experienceType', e.target.value)}
                  >
                    <option value="Fresher">Fresher</option>
                    <option value="Experienced">Experienced</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: RESUME & STAGE NOTES                                               */}
        {/* ========================================================================= */}
        {tab === 'notes' && (
          <div className="space-y-8">
            {/* Resume Document */}
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Resume Document</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Link to candidate resume or CV uploaded document.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Resume / CV URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      className={inputClass}
                      value={form.cvUrl}
                      onChange={(e) => setField('cvUrl', e.target.value)}
                      placeholder="e.g. https://... or uploaded resume file path"
                    />
                    {form.cvUrl && (
                      <a
                        href={form.cvUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center gap-1.5 shrink-0 hover:bg-purple-100 transition"
                      >
                        <ExternalLink size={13} />
                        <span>View</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Round Stage Evaluation Notes */}
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Multi-Round Stage Notes</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Level-wise interview feedback and historical stage notes.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Daily Candidate Registration Notes</label>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={form.stageNotes?.daily || ''}
                    onChange={(e) => setStageNote('daily', e.target.value)}
                    placeholder="Notes from initial registration or daily telephonic connect..."
                  />
                </div>

                <div>
                  <label className={labelClass}>Assessment Notes</label>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={form.stageNotes?.assessment || ''}
                    onChange={(e) => setStageNote('assessment', e.target.value)}
                    placeholder="MCQ evaluation score, proctoring, and test feedback..."
                  />
                </div>

                <div>
                  <label className={labelClass}>1st Round Interview Notes</label>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={form.stageNotes?.round1 || ''}
                    onChange={(e) => setStageNote('round1', e.target.value)}
                    placeholder="Technical/HR 1st round feedback, discussion notes..."
                  />
                </div>

                <div>
                  <label className={labelClass}>2nd Round Interview Notes</label>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={form.stageNotes?.round2 || ''}
                    onChange={(e) => setStageNote('round2', e.target.value)}
                    placeholder="Managerial/practical 2nd round feedback, code review..."
                  />
                </div>

                <div>
                  <label className={labelClass}>Selection & Training Notes</label>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={form.stageNotes?.selected || form.stageNotes?.training || ''}
                    onChange={(e) => {
                      setStageNote('selected', e.target.value);
                      setStageNote('training', e.target.value);
                    }}
                    placeholder="Final selection remarks, offer discussion, or training progression..."
                  />
                </div>

                <div>
                  <label className={labelClass}>Rejection Reason & Notes (If Applicable)</label>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={form.stageNotes?.rejected || ''}
                    onChange={(e) => setStageNote('rejected', e.target.value)}
                    placeholder="Specific reason and evaluation notes if candidate was rejected..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>General Recruiter Remarks</label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={form.comments}
                    onChange={(e) => {
                      setField('comments', e.target.value);
                      setField('remarks', e.target.value);
                    }}
                    placeholder="Overall candidate impression, next action items..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditCandidate;
