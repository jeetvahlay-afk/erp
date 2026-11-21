import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  ChevronDown,
  Download,
  Edit3,
  Eye,
  FileText,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { downloadCsv } from '../lib/export';
import { feedback } from '../lib/feedback';
import {
  Avatar,
  EmptyState,
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
  'Mumbai',
  'Pune',
  'Delhi',
  'Bangalore',
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
  interview: {
    id: 'interview',
    title: 'Interview Candidate Updates',
    subtitle:
      'Comprehensive interview log, HR & CSM evaluations, joining & onboarding status',
    tabs: [
      { id: 'Assessment Done', label: 'Assessment Done' },
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

  // 1. Interview Candidate Updates pipeline (1st Round, 2nd Round, Assessment Done, Selected, Rejected)
  if (
    norm.includes('1st round') ||
    norm.includes('2nd round') ||
    norm.includes('assessment') ||
    norm === 'selected' ||
    norm === 'rejected'
  ) {
    return 'interview';
  }

  // 2. Training Candidates pipeline
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

  // 3. Daily Candidates Update pipeline
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

const ManageInterviews = () => {
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
  const [editingFromDetails, setEditingFromDetails] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      // Interview
      'Assessment Done': 0,
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
      } else if (sec === 'interview') {
        if (norm.includes('assessment')) result['Assessment Done'] += 1;
        else if (norm.includes('1st round')) result['1st Round'] += 1;
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
      } else if (activeSectionKey === 'interview') {
        if (activeSubTab === 'Assessment Done') matchesSubTab = norm.includes('assessment');
        else if (activeSubTab === '1st Round') matchesSubTab = norm.includes('1st round');
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
    let defaultStatus = 'New candidates info';
    if (['New candidates info', 'Interview Scheduled', 'Rescheduled', 'No Response'].includes(activeSubTab)) {
      defaultStatus = activeSubTab;
    }

    setForm({
      ...emptyForm(),
      status: defaultStatus,
    });
  };

  const openEdit = (record) => {
    setSelected(record);
    setForm({
      ...emptyForm(),
      ...record,
      candidateName: record.candidateName || '',
      phoneNumber: record.phoneNumber || '',
      email: record.email || '',
      gender: record.gender || '',
      maritalStatus: record.maritalStatus || '',
      address: record.address || '',
      experience: record.experience || '',
      experienceType: record.experienceType || '',
      candidatePost: record.candidatePost || '',
      cvUrl: record.cvUrl || record.resumeUrl || '',
      candidateReference: record.candidateReference || '',
      status: record.status || 'New candidates info',
      interviewScore: record.interviewScore || '',
      reference: record.reference || '',
      branch: record.branch || 'Ahmedabad',
      comments: (record.stageNotes?.[getStageKeyForStatus(record.status)]) || record.comments || record.remarks || '',
      remarks: (record.stageNotes?.[getStageKeyForStatus(record.status)]) || record.remarks || record.comments || '',
      entryDate: record.entryDate
        ? new Date(record.entryDate).toISOString().slice(0, 10)
        : todayIso(),
      interviewDate: record.interviewDate
        ? new Date(record.interviewDate).toISOString().slice(0, 10)
        : '',
      interviewTime: record.interviewTime || '',
    });
  };

  const save = async () => {
    if (!form.candidateName.trim()) {
      feedback.error('Candidate Name is required.');
      return;
    }
    if (!form.phoneNumber.trim()) {
      feedback.error('Phone Number is required.');
      return;
    }
    const notes = (form.comments || form.remarks || '').trim();
    if (!notes) {
      feedback.error('Comments / Notes are mandatory.');
      return;
    }

    setSubmitting(true);
    try {
      const currentKey = getStageKeyForStatus(form.status);
      const prevStageNotes = selected && selected !== 'new' ? { ...(selected.stageNotes || {}) } : {};
      prevStageNotes[currentKey] = notes;

      const payload = {
        ...form,
        stageNotes: prevStageNotes,
        comments: notes,
        remarks: notes,
      };
      let savedCandidate = null;
      if (selected === 'new') {
        const res = await api.post('/api/interviews', payload);
        savedCandidate = res.data;
      } else {
        const res = await api.put(`/api/interviews/${selected._id}`, payload);
        savedCandidate = res.data;
      }
      feedback.success(
        selected === 'new' ? 'Candidate created successfully' : 'Candidate updated successfully'
      );
      setSelected(null);
      if (editingFromDetails && savedCandidate) {
        setViewingCandidate(savedCandidate);
        setEditingFromDetails(false);
      }
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
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Candidate</span>
            </button>
          </div>
        }
      />

      {/* 2. Pipeline Section Navigation Switcher Pills */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs w-fit">
        <button
          type="button"
          onClick={() => setMainSection('daily')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeSectionKey === 'daily'
              ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 font-bold shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Daily Candidate Update
        </button>
        <button
          type="button"
          onClick={() => setMainSection('interview')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeSectionKey === 'interview'
              ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 font-bold shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Interview Candidate Updates
        </button>
        <button
          type="button"
          onClick={() => setMainSection('training')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeSectionKey === 'training'
              ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 font-bold shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Training Candidates
        </button>
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
              className={`flex items-center gap-2 pb-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 border-b-2 -mb-px ${
                isActive
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
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
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">CANDIDATE</th>
                  <th className="py-2.5 px-2.5">PHONE NUMBER</th>
                  <th className="py-2.5 px-2.5">POST</th>
                  <th className="py-2.5 px-2.5">BRANCH</th>
                  <th className="py-2.5 px-2.5">STATUS</th>
                  <th className="py-2.5 px-2.5">SCHEDULED TIMING</th>
                  <th className="py-2.5 px-2.5">COMMENTS / NOTES</th>
                  <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filtered.map((record) => (
                  <tr
                    key={record._id}
                    onClick={() => setViewingCandidate(record)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingCandidate(record);
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
                      {record.interviewDate ? (
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
                            setViewingCandidate(record);
                          }}
                          title="View Candidate Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(record);
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={`No candidates found in "${activeSubTab}"`}
            message={`There are currently no candidates matching the "${activeSubTab}" pipeline stage in ${branchFilter || 'all branches'}.`}
            action={
              <ToolbarButton primary icon={Plus} onClick={openCreate}>
                Add Candidate
              </ToolbarButton>
            }
          />
        )}

        {/* Card Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Showing {filtered.length} entries</span>
          <span>Pipeline Stage: <strong className="text-slate-700 dark:text-slate-300">{activeSubTab}</strong></span>
        </div>
      </section>

      {/* 1. Add Candidate Modal - Simple Creation Form (Matches Image 1) */}
      <Modal
        open={selected === 'new'}
        size="lg"
        title="Add New Candidate"
        subtitle="Daily candidate update & recruiter master record"
        onClose={() => {
          setSelected(null);
          setEditingFromDetails(false);
        }}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setEditingFromDetails(false);
              }}
              className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={save}
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
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                placeholder="e.g. Saloni Chavan"
                value={form.candidateName}
                onChange={(event) =>
                  setForm({ ...form, candidateName: event.target.value })
                }
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                placeholder="e.g. 8149931409"
                value={form.phoneNumber}
                onChange={(event) =>
                  setForm({ ...form, phoneNumber: event.target.value })
                }
              />
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
                placeholder="e.g. Workindia, Referral, HR Name"
                value={form.candidateReference}
                onChange={(event) =>
                  setForm({ ...form, candidateReference: event.target.value })
                }
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Entry Date
              </label>
              <input
                type="date"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                value={form.entryDate}
                onChange={(event) =>
                  setForm({ ...form, entryDate: event.target.value })
                }
              />
            </div>
          </div>

          {/* Row 3: Candidate Post | Interview Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Candidate Post
              </label>
              <input
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                placeholder="BDA Telesale"
                value={form.candidatePost}
                onChange={(event) =>
                  setForm({ ...form, candidatePost: event.target.value })
                }
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Interview Status
              </label>
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value })
                }
              >
                <optgroup label="Daily Stage">
                  <option value="New candidates info">New candidates info</option>
                  <option value="Interview Scheduled">Interview Scheduled</option>
                  <option value="Rescheduled">Rescheduled</option>
                  <option value="No Response">No Response</option>
                </optgroup>
                <optgroup label="Interview Rounds">
                  <option value="Assessment Done">Assessment Done</option>
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
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                value={form.interviewDate}
                onChange={(event) =>
                  setForm({ ...form, interviewDate: event.target.value })
                }
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Schedule Interview Time
              </label>
              <input
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                placeholder="e.g. 03:00 PM"
                value={form.interviewTime}
                onChange={(event) =>
                  setForm({ ...form, interviewTime: event.target.value })
                }
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
                onChange={(event) =>
                  setForm({ ...form, branch: event.target.value })
                }
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
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition resize-y"
              placeholder="e.g. 10.14: She asking for WFH / Not able to do night shift (Mandatory)"
              value={form.comments}
              onChange={(event) =>
                setForm({
                  ...form,
                  comments: event.target.value,
                  remarks: event.target.value,
                })
              }
            />
          </div>
        </div>
      </Modal>

      {/* 2. Edit Candidate Modal - Comprehensive 2-Column Form (Matches Image 2) */}
      <Modal
        open={Boolean(selected && selected !== 'new')}
        size="xl"
        title="Edit Candidate"
        subtitle="Daily candidate update & recruiter master record"
        onClose={() => {
          setSelected(null);
          setEditingFromDetails(false);
        }}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setEditingFromDetails(false);
              }}
              className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={save}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              {submitting ? 'Saving…' : 'Save Candidate'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Card: Personal Information */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-slate-800 pb-2">
                <FileText size={15} className="text-blue-500" />
                <span>Personal Information</span>
              </div>

              {/* Candidate Name * */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Candidate Name <span className="text-rose-500">*</span>
                </label>
                <input
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                  placeholder="e.g. Mahendra Siloriya"
                  value={form.candidateName}
                  onChange={(event) =>
                    setForm({ ...form, candidateName: event.target.value })
                  }
                />
              </div>

              {/* Email & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g. mahisiloriya@gmail.com"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Mobile / Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g. 9630852516"
                    value={form.phoneNumber}
                    onChange={(event) =>
                      setForm({ ...form, phoneNumber: event.target.value })
                    }
                  />
                </div>
              </div>

              {/* Gender & Marital Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Gender
                  </label>
                  <select
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                    value={form.gender}
                    onChange={(event) =>
                      setForm({ ...form, gender: event.target.value })
                    }
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Marital Status
                  </label>
                  <select
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                    value={form.maritalStatus}
                    onChange={(event) =>
                      setForm({ ...form, maritalStatus: event.target.value })
                    }
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Address
                </label>
                <input
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                  placeholder="e.g. Ahmedabad, Gujarat"
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                />
              </div>

              {/* Experience & Experience Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Experience
                  </label>
                  <input
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g. 0 Years / 2 Years"
                    value={form.experience}
                    onChange={(event) =>
                      setForm({ ...form, experience: event.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Experience Type
                  </label>
                  <select
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                    value={form.experienceType}
                    onChange={(event) =>
                      setForm({ ...form, experienceType: event.target.value })
                    }
                  >
                    <option value="">Select Type</option>
                    <option value="Fresher">Fresher</option>
                    <option value="Experienced">Experienced</option>
                  </select>
                </div>
              </div>

              {/* Registered On / Entry Date */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Registered On / Entry Date
                </label>
                <input
                  type="date"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                  value={form.entryDate}
                  onChange={(event) =>
                    setForm({ ...form, entryDate: event.target.value })
                  }
                />
              </div>
            </div>

            {/* Right Card: Professional Details */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-slate-800 pb-2">
                <Briefcase size={15} className="text-blue-500" />
                <span>Professional Details</span>
              </div>

              {/* Designation / Applied Post */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Designation / Applied Post
                </label>
                <input
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                  placeholder="e.g. Customer Support Associate"
                  value={form.candidatePost}
                  onChange={(event) =>
                    setForm({ ...form, candidatePost: event.target.value })
                  }
                />
              </div>

              {/* CV / Resume Link */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  CV / Resume Link (or File Name)
                </label>
                <input
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                  placeholder="e.g. https://... or mahendra_resume_cs.pdf"
                  value={form.cvUrl}
                  onChange={(event) =>
                    setForm({ ...form, cvUrl: event.target.value })
                  }
                />
              </div>

              {/* Source & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Source (Candidate Reference)
                  </label>
                  <input
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g. Walk-in Drive, LinkedIn"
                    value={form.candidateReference}
                    onChange={(event) =>
                      setForm({ ...form, candidateReference: event.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Reference
                  </label>
                  <input
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g. Internal Ref / Code"
                    value={form.reference}
                    onChange={(event) =>
                      setForm({ ...form, reference: event.target.value })
                    }
                  />
                </div>
              </div>

              {/* Status & Interview Status / Score */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Status
                  </label>
                  <select
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                  >
                    <optgroup label="Daily Stage">
                      <option value="New candidates info">New candidates info</option>
                      <option value="Interview Scheduled">Interview Scheduled</option>
                      <option value="Rescheduled">Rescheduled</option>
                      <option value="No Response">No Response</option>
                    </optgroup>
                    <optgroup label="Interview Rounds">
                      <option value="Assessment Done">Assessment Done</option>
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
                    {form.status &&
                      ![
                        'New candidates info',
                        'Interview Scheduled',
                        'Rescheduled',
                        'No Response',
                        'Assessment Done',
                        '1st Round',
                        '2nd Round',
                        'Selected',
                        'Rejected',
                        'Ongoing',
                        'Completed',
                        'Ineligible',
                        'Left',
                        'Discontinued',
                      ].includes(form.status) && (
                        <option value={form.status}>{form.status}</option>
                      )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Interview Status / Score
                  </label>
                  <input
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g. 30/50"
                    value={form.interviewScore}
                    onChange={(event) =>
                      setForm({ ...form, interviewScore: event.target.value })
                    }
                  />
                </div>
              </div>

              {/* Schedule Interview Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Schedule Interview Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                    value={form.interviewDate}
                    onChange={(event) =>
                      setForm({ ...form, interviewDate: event.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Schedule Interview Time
                  </label>
                  <input
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g. 11:00 AM"
                    value={form.interviewTime}
                    onChange={(event) =>
                      setForm({ ...form, interviewTime: event.target.value })
                    }
                  />
                </div>
              </div>

              {/* Branch */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Branch
                </label>
                <select
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                  value={form.branch}
                  onChange={(event) =>
                    setForm({ ...form, branch: event.target.value })
                  }
                >
                  {BRANCH_OPTIONS.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Comments / Notes * (Mandatory) */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Comments / Notes <span className="text-rose-500">* (Mandatory)</span>
            </label>
            <textarea
              rows={3}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition resize-y"
              placeholder="Enter recruiter feedback, interview discussion notes, or requirements..."
              value={form.comments}
              onChange={(event) =>
                setForm({
                  ...form,
                  comments: event.target.value,
                  remarks: event.target.value,
                })
              }
            />
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
          setEditingFromDetails(true);
          openEdit(cand);
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
