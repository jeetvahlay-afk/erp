import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Briefcase,
  ChevronDown,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Link2,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { downloadCsv } from '../lib/export';
import { feedback } from '../lib/feedback';
import {
  Avatar,
  ErrorState,
  formatDate,
  LoadingState,
  Modal,
  PageHeader,
  SearchInput,
  StatusBadge,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';
import CandidateDetailsModal, { getStageKeyForStatus } from '../components/CandidateDetailsModal';

const BRANCH_OPTIONS = [
  'Ahmedabad',
  'Surat',
  'Vadodara',
  'Rajkot',
  'Mumbai',
  'Pune',
  'Bangalore',
  'Delhi',
  'Remote',
];

const SECTIONS = {
  daily: {
    id: 'daily',
    title: 'Daily Candidate Update',
    subtitle: '',
    tabs: [
      { id: 'New candidates info', label: 'New candidates info' },
      { id: 'Interview Scheduled', label: 'Interview Scheduled' },
      { id: 'Rescheduled', label: 'Rescheduled' },
      { id: 'No Response', label: 'No Response' },
    ],
  },
  assessment: {
    id: 'assessment',
    title: 'Assessment Update',
    subtitle: '',
    tabs: [
      { id: 'Pending', label: 'Pending' },
      { id: 'Running', label: 'Running' },
      { id: 'Red', label: 'Red' },
      { id: 'Yellow', label: 'Yellow' },
      { id: 'Green', label: 'Green' },
    ],
  },
  interview: {
    id: 'interview',
    title: 'Interview Candidate Updates',
    subtitle:
      'Comprehensive interview log, HR & CSM evaluations, joining & onboarding status',
    tabs: [
      { id: '1st Round', label: '1st Round' },
      { id: '2nd Round', label: '2nd Round' },
      { id: 'Selected', label: 'Selected' },
      { id: 'Rejected', label: 'Rejected' },
    ],
  },
  training: {
    id: 'training',
    title: 'Training Candidates',
    subtitle: 'Manage training batches, enrolled candidates & induction status',
    tabs: [
      { id: 'All Trainees', label: 'All Trainees' },
      { id: 'Ongoing', label: 'Ongoing' },
      { id: 'Completed', label: 'Completed' },
      { id: 'Ineligible', label: 'Ineligible' },
      { id: 'Left', label: 'Left' },
      { id: 'Discontinued', label: 'Discontinued' },
    ],
  },
};

const normalizeStatus = (val) => String(val || '').toLowerCase().trim();

const getSectionForRecord = (record) => {
  const norm = normalizeStatus(record.status);
  const trainingNorm = normalizeStatus(record.trainingStatus);
  const stageNorm = normalizeStatus(record.stage);

  // 1. Assessment Update pipeline (Pending, Running, Red, Yellow, Green, Assessment Done)
  if (
    ['pending', 'running', 'red', 'yellow', 'green'].includes(norm) ||
    norm.includes('assessment')
  ) {
    return 'assessment';
  }

  // 2. Interview Candidate Updates pipeline (1st Round, 2nd Round, Selected, Rejected)
  if (
    norm.includes('1st round') ||
    norm.includes('2nd round') ||
    norm === 'selected' ||
    norm === 'rejected'
  ) {
    return 'interview';
  }

  // 3. Training Candidates pipeline
  if (
    [
      'all trainees',
      'ongoing',
      'completed',
      'ineligible',
      'left',
      'discontinued',
      'in training',
      'training candidates',
      'training',
    ].includes(norm) ||
    ['ongoing', 'completed', 'ineligible', 'left', 'discontinued'].includes(trainingNorm)
  ) {
    return 'training';
  }

  // 4. Daily Candidates Update pipeline
  if (
    norm.includes('new candidate') ||
    norm === 'interview scheduled' ||
    norm === 'scheduled' ||
    norm.includes('reschedule') ||
    norm.includes('no response') ||
    norm.includes('no respones')
  ) {
    return 'daily';
  }

  // Fallback to stage if defined
  if (stageNorm.includes('assessment')) return 'assessment';
  if (stageNorm.includes('interview')) return 'interview';
  if (stageNorm.includes('training')) return 'training';
  return 'daily';
};

const getStatusTone = (status) => {
  const norm = normalizeStatus(status);
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
  if (norm.includes('ongoing') || norm.includes('in training') || norm.includes('training'))
    return 'primary';
  if (norm.includes('completed') || norm.includes('joined')) return 'success';
  if (norm.includes('ineligible') || norm.includes('left') || norm.includes('discontinued'))
    return 'danger';
  return 'neutral';
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  candidateName: '',
  phoneNumber: '',
  email: '',
  gender: '',
  maritalStatus: '',
  address: '',
  experience: '',
  experienceType: '',
  entryDate: todayIso(),
  candidatePost: '',
  cvUrl: '',
  candidateReference: '',
  status: 'New candidates info',
  interviewScore: '',
  reference: '',
  interviewDate: '',
  interviewTime: '',
  branch: 'Ahmedabad',
  comments: '',
  remarks: '',
  trainingStatus: '',
});

const validateCandidateForm = (formData) => {
  const errors = {};

  // Candidate Name * (Required, letters, 2-120 chars)
  const name = String(formData.candidateName || '').trim();
  if (!name) {
    errors.candidateName = 'Candidate Name is required.';
  } else if (name.length < 2) {
    errors.candidateName = 'Candidate Name must be at least 2 characters.';
  } else if (name.length > 120) {
    errors.candidateName = 'Candidate Name must not exceed 120 characters.';
  } else if (!/[a-zA-Z]/.test(name)) {
    errors.candidateName = 'Candidate Name must contain valid letters.';
  }

  // Mobile / Phone * (Required, 7-15 digits)
  const phone = String(formData.phoneNumber || '').trim();
  const digitsOnly = phone.replace(/\D/g, '');
  if (!phone) {
    errors.phoneNumber = 'Mobile / Phone number is required.';
  } else if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    errors.phoneNumber = 'Phone number must contain between 7 and 15 digits.';
  } else if (!/^\+?[0-9\s-]{7,20}$/.test(phone)) {
    errors.phoneNumber = 'Please enter a valid phone number (e.g. +91 98765 43210).';
  }

  // Email (Optional, but validated if entered)
  const emailVal = String(formData.email || '').trim();
  if (emailVal) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailVal)) {
      errors.email = 'Please enter a valid email address (e.g. rahul.sharma@example.com).';
    } else if (emailVal.length > 254) {
      errors.email = 'Email address must not exceed 254 characters.';
    }
  }

  // Comments / Notes * (Mandatory, min 5 chars)
  const notes = String(formData.comments || formData.remarks || '').trim();
  if (!notes) {
    errors.comments = 'Comments / Notes are mandatory.';
  } else if (notes.length < 5) {
    errors.comments = 'Comments / Notes must be at least 5 characters long.';
  }

  // Designation / Candidate Post (if provided, min 2 chars)
  const post = String(formData.candidatePost || '').trim();
  if (post && post.length < 2) {
    errors.candidatePost = 'Designation must be at least 2 characters.';
  } else if (post.length > 120) {
    errors.candidatePost = 'Designation must not exceed 120 characters.';
  }

  // Entry Date
  if (formData.entryDate && isNaN(new Date(formData.entryDate).getTime())) {
    errors.entryDate = 'Please select a valid entry date.';
  }

  // Schedule Interview Date & Time consistency
  if (formData.interviewTime && !formData.interviewDate) {
    errors.interviewDate = 'Please select an interview date for the scheduled time.';
  }

  // CV / Resume Link length
  const cv = String(formData.cvUrl || '').trim();
  if (cv && cv.length > 500) {
    errors.cvUrl = 'CV link must not exceed 500 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

const ManageInterviews = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Main Section (daily | interview | training)
  const activeSectionKey = searchParams.get('section') || 'daily';
  const setMainSection = (key) => {
    setSearchParams({ section: key });
    // Reset active subtab to the first tab of the section
    const sec = SECTIONS[key] || SECTIONS.daily;
    setActiveSubTab(sec.tabs[0].id);
  };

  const currentSection = SECTIONS[activeSectionKey] || SECTIONS.daily;
  const [activeSubTab, setActiveSubTab] = useState(currentSection.tabs[0].id);

  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [viewingCandidate, setViewingCandidate] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFieldChange = (field, value) => {
    let updatedForm = { ...form, [field]: value };

    // Linked logic: Comments and Remarks stay synchronized
    if (field === 'comments') {
      updatedForm.remarks = value;
    } else if (field === 'remarks') {
      updatedForm.comments = value;
    }

    // Linked logic: Experience and Experience Type
    if (field === 'experienceType') {
      if (value === 'Fresher' && (!updatedForm.experience || updatedForm.experience === '0' || updatedForm.experience === '0 Years')) {
        updatedForm.experience = 'Fresher';
      } else if (value === 'Experienced' && updatedForm.experience === 'Fresher') {
        updatedForm.experience = '';
      }
    } else if (field === 'experience') {
      if (String(value).toLowerCase().includes('fresher') && !updatedForm.experienceType) {
        updatedForm.experienceType = 'Fresher';
      }
    }

    setForm(updatedForm);

    if (touched[field]) {
      const { errors } = validateCandidateForm(updatedForm);
      setFormErrors(errors);
    }
  };

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const { errors } = validateCandidateForm(form);
    setFormErrors(errors);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const recordResponse = await api.get('/api/interviews');
      setRecords(asArray(recordResponse.data));
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load recruitment records'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Synchronize active subtab when switching section
  useEffect(() => {
    if (!currentSection.tabs.some((t) => t.id === activeSubTab)) {
      setActiveSubTab(currentSection.tabs[0].id);
    }
  }, [activeSectionKey, currentSection]);

  // Compute counts for all tabs across all sections
  const counts = useMemo(() => {
    const result = {
      // Daily
      'New candidates info': 0,
      'Interview Scheduled': 0,
      Rescheduled: 0,
      'No Response': 0,
      // Assessment
      Pending: 0,
      Running: 0,
      Red: 0,
      Yellow: 0,
      Green: 0,
      // Interview
      '1st Round': 0,
      '2nd Round': 0,
      Selected: 0,
      Rejected: 0,
      // Training
      'All Trainees': 0,
      Ongoing: 0,
      Completed: 0,
      Ineligible: 0,
      Left: 0,
      Discontinued: 0,
    };

    records.forEach((record) => {
      const sec = getSectionForRecord(record);
      const norm = normalizeStatus(record.status);
      const tNorm = normalizeStatus(record.trainingStatus);

      if (sec === 'daily') {
        if (norm.includes('new candidate')) result['New candidates info'] += 1;
        else if (norm.includes('interview scheduled') || norm === 'scheduled')
          result['Interview Scheduled'] += 1;
        else if (norm.includes('reschedule')) result['Rescheduled'] += 1;
        else if (norm.includes('no response') || norm.includes('no respones'))
          result['No Response'] += 1;
        else result['New candidates info'] += 1;
      } else if (sec === 'assessment') {
        if (norm === 'running' || norm.includes('running')) {
          result['Running'] += 1;
        } else if (norm === 'red' || norm.includes('red')) {
          result['Red'] += 1;
        } else if (norm === 'yellow' || norm.includes('yellow')) {
          result['Yellow'] += 1;
        } else if (norm === 'green' || norm.includes('green')) {
          result['Green'] += 1;
        } else {
          result['Pending'] += 1;
        }
      } else if (sec === 'interview') {
        if (norm.includes('1st round')) result['1st Round'] += 1;
        else if (norm.includes('2nd round')) result['2nd Round'] += 1;
        else if (norm.includes('selected')) result['Selected'] += 1;
        else if (norm.includes('rejected')) result['Rejected'] += 1;
      } else if (sec === 'training') {
        result['All Trainees'] += 1;
        if (norm === 'ongoing' || tNorm === 'ongoing' || norm === 'in training')
          result['Ongoing'] += 1;
        else if (norm === 'completed' || tNorm === 'completed' || norm === 'joined')
          result['Completed'] += 1;
        else if (norm === 'ineligible' || tNorm === 'ineligible') result['Ineligible'] += 1;
        else if (norm === 'left' || tNorm === 'left') result['Left'] += 1;
        else if (norm === 'discontinued' || tNorm === 'discontinued')
          result['Discontinued'] += 1;
        else result['Ongoing'] += 1;
      }
    });

    return result;
  }, [records]);

  // Filter records by current section, active sub-tab, search, and branch
  const filtered = useMemo(() => {
    return records.filter((record) => {
      const sec = getSectionForRecord(record);
      if (sec !== activeSectionKey) return false;

      const norm = normalizeStatus(record.status);
      const tNorm = normalizeStatus(record.trainingStatus);

      // Match subtab
      let matchesSubTab = false;
      if (activeSectionKey === 'daily') {
        if (activeSubTab === 'New candidates info')
          matchesSubTab =
            norm.includes('new candidate') ||
            (!norm.includes('interview scheduled') &&
              norm !== 'scheduled' &&
              !norm.includes('reschedule') &&
              !norm.includes('no response') &&
              !norm.includes('no respones'));
        else if (activeSubTab === 'Interview Scheduled')
          matchesSubTab = norm.includes('interview scheduled') || norm === 'scheduled';
        else if (activeSubTab === 'Rescheduled') matchesSubTab = norm.includes('reschedule');
        else if (activeSubTab === 'No Response')
          matchesSubTab = norm.includes('no response') || norm.includes('no respones');
      } else if (activeSectionKey === 'assessment') {
        if (activeSubTab === 'Pending')
          matchesSubTab =
            norm === 'pending' ||
            norm.includes('pending') ||
            norm === 'assessment done' ||
            norm === 'assessment';
        else if (activeSubTab === 'Running')
          matchesSubTab = norm === 'running' || norm.includes('running');
        else if (activeSubTab === 'Red')
          matchesSubTab = norm === 'red' || norm.includes('red');
        else if (activeSubTab === 'Yellow')
          matchesSubTab = norm === 'yellow' || norm.includes('yellow');
        else if (activeSubTab === 'Green')
          matchesSubTab = norm === 'green' || norm.includes('green');
        else matchesSubTab = norm.includes('assessment');
      } else if (activeSectionKey === 'interview') {
        if (activeSubTab === '1st Round') matchesSubTab = norm.includes('1st round');
        else if (activeSubTab === '2nd Round') matchesSubTab = norm.includes('2nd round');
        else if (activeSubTab === 'Selected') matchesSubTab = norm.includes('selected');
        else if (activeSubTab === 'Rejected') matchesSubTab = norm.includes('rejected');
      } else if (activeSectionKey === 'training') {
        if (activeSubTab === 'All Trainees') matchesSubTab = true;
        else if (activeSubTab === 'Ongoing')
          matchesSubTab =
            norm === 'ongoing' || tNorm === 'ongoing' || norm === 'in training';
        else if (activeSubTab === 'Completed')
          matchesSubTab =
            norm === 'completed' || tNorm === 'completed' || norm === 'joined';
        else if (activeSubTab === 'Ineligible')
          matchesSubTab = norm === 'ineligible' || tNorm === 'ineligible';
        else if (activeSubTab === 'Left')
          matchesSubTab = norm === 'left' || tNorm === 'left';
        else if (activeSubTab === 'Discontinued')
          matchesSubTab = norm === 'discontinued' || tNorm === 'discontinued';
      }

      if (!matchesSubTab) return false;

      // Branch filter
      if (branchFilter && record.branch !== branchFilter) return false;

      // Search
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [
        record.candidateName,
        record.phoneNumber,
        record.candidateReference,
        record.candidatePost,
        record.branch,
        record.comments,
        record.remarks,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [records, activeSectionKey, activeSubTab, branchFilter, search]);

  const openCreate = () => {
    setSelected('new');
    setFormErrors({});
    setTouched({});
    let defaultStatus = 'New candidates info';
    if (['New candidates info', 'Interview Scheduled', 'Rescheduled', 'No Response'].includes(activeSubTab)) {
      defaultStatus = activeSubTab;
    } else if (['Pending', 'Running', 'Red', 'Yellow', 'Green'].includes(activeSubTab)) {
      defaultStatus = activeSubTab;
    }

    setForm({
      ...emptyForm(),
      status: defaultStatus,
    });
  };

  const save = async () => {
    const { isValid, errors } = validateCandidateForm(form);
    if (!isValid) {
      setFormErrors(errors);
      const allTouched = {};
      Object.keys(errors).forEach((k) => { allTouched[k] = true; });
      setTouched((prev) => ({ ...prev, ...allTouched }));
      const firstError = Object.values(errors)[0];
      feedback.error(firstError || 'Please fix the errors in the form before saving.');
      return;
    }

    setSubmitting(true);
    try {
      const notes = (form.comments || form.remarks || '').trim();
      const currentKey = getStageKeyForStatus(form.status);
      const prevStageNotes = {};
      if (notes) prevStageNotes[currentKey] = notes;

      const payload = {
        ...form,
        stageNotes: prevStageNotes,
        comments: notes,
        remarks: notes,
      };
      await api.post('/api/interviews', payload);
      feedback.success('Candidate created successfully');
      setSelected(null);
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to save candidate'));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (record) => {
    const accepted = await feedback.confirm(
      `Delete recruitment record for ${record.candidateName}?`,
      { title: 'Delete candidate record', confirmLabel: 'Delete', tone: 'danger' }
    );
    if (!accepted) return;
    try {
      await api.delete(`/api/interviews/${record._id}`);
      feedback.success('Candidate record deleted');
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to delete candidate'));
    }
  };

  if (loading) return <LoadingState label="Loading recruitment data…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header matching other ERP pages */}
      <PageHeader
        title="Recruitment Management"
        breadcrumbs={['HR Management', 'Recruitment Management']}
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton
              icon={Link2}
              onClick={() => {
                const base = (import.meta.env.VITE_ASSESSMENT_PORTAL_URL || `${window.location.protocol}//${window.location.hostname}:5174`).replace(/\/$/, '');
                const url = `${base}/register`;
                navigator.clipboard.writeText(url);
                feedback.success(`Assessment link copied: ${url}`);
              }}
            >
              Copy Assessment Link
            </ToolbarButton>
            <ToolbarButton
              icon={Download}
              onClick={() =>
                downloadCsv(`recruitment-${activeSectionKey}-candidates.csv`, filtered)
              }
            >
              Export CSV
            </ToolbarButton>
            <button
              type="button"
              onClick={openCreate}
              style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Candidate</span>
            </button>
          </div>
        }
      />

      {/* 2. Pipeline Section Navigation Switcher Pills */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs w-fit">
        {[
          { key: 'daily', label: 'Daily Candidate Update' },
          { key: 'assessment', label: 'Assessment Update' },
          { key: 'interview', label: 'Interview Candidate Updates' },
          { key: 'training', label: 'Training Candidates' },
        ].map((sec) => {
          const isActive = activeSectionKey === sec.key;
          return (
            <button
              key={sec.key}
              type="button"
              onClick={() => setMainSection(sec.key)}
              style={
                isActive
                  ? {
                      color: 'var(--erp-primary, #2563eb)',
                    }
                  : undefined
              }
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* 3. Pipeline Subtabs with Clean Underline Indicator */}
      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar pt-1">
        {currentSection.tabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          const count = counts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              style={
                isActive
                  ? {
                      borderColor: 'var(--erp-primary, #2563eb)',
                      color: 'var(--erp-primary, #2563eb)',
                    }
                  : undefined
              }
              className={`flex items-center gap-2 pb-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 border-b-2 -mb-px ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                style={
                  isActive
                    ? {
                        backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 12%, transparent)',
                        color: 'var(--erp-primary, #2563eb)',
                      }
                    : undefined
                }
                className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Single Unified Pipeline Card Container */}
      <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">

        {/* Integrated Filter Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:max-w-md">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={`Search ${activeSubTab} by name, phone, post, remarks...`}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto">
            <div className="relative w-full sm:w-auto">
              <select
                className="appearance-none w-full sm:w-auto bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3.5 py-2 pr-8 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition focus:outline-none cursor-pointer"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="">All Branches</option>
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>

            {(search || branchFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setBranchFilter('');
                }}
                className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Reset Filters"
              >
                <RotateCcw size={13} className="text-slate-400" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area: Candidates Pipeline Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">CANDIDATE</th>
                <th className="py-2.5 px-2.5">PHONE NUMBER</th>
                <th className="py-2.5 px-2.5">POST</th>
                <th className="py-2.5 px-2.5">BRANCH</th>
                <th className="py-2.5 px-2.5">STATUS</th>
                <th className="py-2.5 px-2.5">
                  {activeSectionKey === 'assessment' ? 'ASSESSMENT SCORE' : 'SCHEDULED TIMING'}
                </th>
                <th className="py-2.5 px-2.5">COMMENTS / NOTES</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 dark:text-slate-500 font-normal">
                    No candidates found.
                  </td>
                </tr>
              ) : (
                filtered.map((record) => (
                  <tr
                    key={record._id}
                    onClick={() => navigate(`/interview/${record._id}`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/interview/${record._id}`);
                        }}
                        className="flex items-center gap-3 text-left cursor-pointer group"
                      >
                        <Avatar user={record} size="sm" />
                        <div>
                          <strong className="block text-slate-900 dark:text-white font-bold group-hover:text-blue-600 transition-colors">
                            {record.candidateName}
                          </strong>
                          <small className="text-slate-400 font-normal">
                            {record.candidateReference
                              ? `Ref: ${record.candidateReference}`
                              : record.email || 'Direct'}
                          </small>
                        </div>
                      </button>
                    </td>
                    <td className="py-2.5 px-2.5 font-semibold text-slate-700 dark:text-slate-300">
                      {record.phoneNumber || '—'}
                    </td>
                    <td className="py-2.5 px-2.5 font-medium text-slate-700 dark:text-slate-300">
                      {record.candidatePost || '—'}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-400">
                      <span className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-medium text-[11px]">
                        {record.branch || 'Ahmedabad'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <StatusBadge tone={getStatusTone(record.status)}>
                        {record.status}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-400">
                      {activeSectionKey === 'assessment' ? (
                        record.interviewScore && record.interviewScore !== 'Pending' ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              record.status === 'Green'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : record.status === 'Yellow'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : record.status === 'Red'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : record.status === 'Running'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 animate-pulse'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {String(record.interviewScore).replace(/\s*\(\d+%\)/g, '')}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium text-[11px] italic">
                            {record.status === 'Running' ? 'In progress...' : 'Pending exam'}
                          </span>
                        )
                      ) : record.interviewDate ? (
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatDate(record.interviewDate)}
                          </span>
                          {record.interviewTime && (
                            <span className="text-slate-500 block text-[11px]">
                              {record.interviewTime}
                            </span>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-400 max-w-[240px]">
                      <span
                        className="line-clamp-2 text-slate-700 dark:text-slate-300 font-normal text-[11px]"
                        title={record.comments || record.remarks || ''}
                      >
                        {record.comments || record.remarks || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className="w-8 h-8 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/interview/${record._id}`);
                          }}
                          title="View Candidate Profile"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit-candidate/${record._id}`);
                          }}
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(record);
                          }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Showing {filtered.length} entries</span>
          <span>Pipeline Stage: <strong className="text-slate-700 dark:text-slate-300">{activeSubTab}</strong></span>
        </div>
      </section>

      {/* 1. Add Candidate Modal - Simple Creation Form */}
      <Modal
        open={selected === 'new'}
        size="lg"
        title="Add New Candidate"
        onClose={() => setSelected(null)}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={save}
              style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              {submitting ? 'Creating…' : 'Create Candidate'}
            </button>
          </div>
        }
      >
        <div className="space-y-3.5 text-xs">
          {/* Row 1: Candidate Name * | Phone Number * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Candidate Name <span className="text-rose-500">*</span>
              </label>
              <input
                className={`w-full bg-white dark:bg-slate-900 border ${
                  touched.candidateName && formErrors.candidateName
                    ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/15'
                    : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                } rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition`}
                placeholder="e.g. Rahul Sharma"
                value={form.candidateName}
                onChange={(event) => handleFieldChange('candidateName', event.target.value)}
                onBlur={() => handleFieldBlur('candidateName')}
              />
              {touched.candidateName && formErrors.candidateName && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  <span>{formErrors.candidateName}</span>
                </p>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                className={`w-full bg-white dark:bg-slate-900 border ${
                  touched.phoneNumber && formErrors.phoneNumber
                    ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/15'
                    : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                } rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition`}
                placeholder="e.g. +91 98765 43210 or 9876543210"
                value={form.phoneNumber}
                onChange={(event) => handleFieldChange('phoneNumber', event.target.value)}
                onBlur={() => handleFieldBlur('phoneNumber')}
              />
              {touched.phoneNumber && formErrors.phoneNumber && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  <span>{formErrors.phoneNumber}</span>
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Candidate Reference | Entry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Candidate Reference
              </label>
              <input
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                placeholder="e.g. WK-50EC430D1592-2026 or Workindia / Referral"
                value={form.candidateReference}
                onChange={(event) => handleFieldChange('candidateReference', event.target.value)}
                onBlur={() => handleFieldBlur('candidateReference')}
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Entry Date
              </label>
              <input
                type="date"
                className={`w-full bg-white dark:bg-slate-900 border ${
                  touched.entryDate && formErrors.entryDate
                    ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/15'
                    : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                } rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none transition cursor-pointer`}
                value={form.entryDate}
                onChange={(event) => handleFieldChange('entryDate', event.target.value)}
                onBlur={() => handleFieldBlur('entryDate')}
              />
              {touched.entryDate && formErrors.entryDate && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  <span>{formErrors.entryDate}</span>
                </p>
              )}
            </div>
          </div>

          {/* Row 3: Candidate Post | Interview Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Candidate Post
              </label>
              <input
                className={`w-full bg-white dark:bg-slate-900 border ${
                  touched.candidatePost && formErrors.candidatePost
                    ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/15'
                    : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                } rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition`}
                placeholder="e.g. Fullstack Developer / Telesales Executive"
                value={form.candidatePost}
                onChange={(event) => handleFieldChange('candidatePost', event.target.value)}
                onBlur={() => handleFieldBlur('candidatePost')}
              />
              {touched.candidatePost && formErrors.candidatePost && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  <span>{formErrors.candidatePost}</span>
                </p>
              )}
            </div>
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Interview Status
              </label>
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                value={form.status}
                onChange={(event) => handleFieldChange('status', event.target.value)}
              >
                <optgroup label="Daily Stage">
                  <option value="New candidates info">New candidates info</option>
                  <option value="Interview Scheduled">Interview Scheduled</option>
                  <option value="Rescheduled">Rescheduled</option>
                  <option value="No Response">No Response</option>
                </optgroup>
                <optgroup label="Assessment Update">
                  <option value="Pending">Pending</option>
                  <option value="Running">Running</option>
                  <option value="Red">Red</option>
                  <option value="Yellow">Yellow</option>
                  <option value="Green">Green</option>
                  <option value="Assessment Done">Assessment Done</option>
                </optgroup>
                <optgroup label="Interview Rounds">
                  <option value="1st Round">1st Round</option>
                  <option value="2nd Round">2nd Round</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                </optgroup>
                <optgroup label="Training Stage">
                  <option value="Ongoing">Ongoing (Training)</option>
                  <option value="Completed">Completed</option>
                  <option value="Ineligible">Ineligible</option>
                  <option value="Left">Left</option>
                  <option value="Discontinued">Discontinued</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Row 4: Schedule Interview Date | Schedule Interview Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Schedule Interview Date
              </label>
              <input
                type="date"
                className={`w-full bg-white dark:bg-slate-900 border ${
                  touched.interviewDate && formErrors.interviewDate
                    ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/15'
                    : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                } rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none transition cursor-pointer`}
                value={form.interviewDate}
                onChange={(event) => handleFieldChange('interviewDate', event.target.value)}
                onBlur={() => handleFieldBlur('interviewDate')}
              />
              {touched.interviewDate && formErrors.interviewDate && (
                <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  <span>{formErrors.interviewDate}</span>
                </p>
              )}
            </div>
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Schedule Interview Time
              </label>
              <input
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                placeholder="e.g. 10:00 AM or 02:30 PM"
                value={form.interviewTime}
                onChange={(event) => handleFieldChange('interviewTime', event.target.value)}
                onBlur={() => handleFieldBlur('interviewTime')}
              />
            </div>
          </div>

          {/* Row 5: Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Branch
              </label>
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                value={form.branch}
                onChange={(event) => handleFieldChange('branch', event.target.value)}
              >
                {BRANCH_OPTIONS.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 6: Comments / Notes * (Mandatory) */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Comments / Notes <span className="text-rose-500">* (Mandatory)</span>
            </label>
            <textarea
              rows={4}
              className={`w-full bg-white dark:bg-slate-900 border ${
                touched.comments && formErrors.comments
                  ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/15'
                  : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
              } rounded-lg p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition resize-y`}
              placeholder="Enter recruiter feedback, interview discussion notes, or requirements... (Mandatory, min 5 chars)"
              value={form.comments}
              onChange={(event) => handleFieldChange('comments', event.target.value)}
              onBlur={() => handleFieldBlur('comments')}
            />
            {touched.comments && formErrors.comments && (
              <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                <AlertCircle size={12} className="flex-shrink-0" />
                <span>{formErrors.comments}</span>
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Candidate Showcase Details Modal */}
      <CandidateDetailsModal
        candidate={viewingCandidate}
        open={Boolean(viewingCandidate)}
        onClose={() => setViewingCandidate(null)}
        onEdit={(cand) => {
          setViewingCandidate(null);
          navigate(`/edit-candidate/${cand._id}`);
        }}
        onDelete={(cand) => {
          setViewingCandidate(null);
          remove(cand);
        }}
        onUpdate={(updated) => {
          setRecords((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
          setViewingCandidate(null);
          const nextSec = getSectionForRecord(updated);
          setMainSection(nextSec);
          setActiveSubTab(updated.status);
        }}
      />
    </div>
  );
};

export default ManageInterviews;
