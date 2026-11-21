import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  History,
  RotateCcw,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import { downloadCsv } from '../lib/export';
import {
  Avatar,
  EmptyState,
  ErrorState,
  formatDate,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  SearchInput,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const FIELD_LABELS = {
  firstName: 'First Name',
  lastName: 'Last Name',
  phone: 'Phone Number',
  emergencyName: 'Emergency Contact Name',
  emergencyPhone: 'Emergency Contact Phone',
  currentAddress: 'Current Address',
  permanentAddress: 'Permanent Address',
  dob: 'Date of Birth',
  bloodGroup: 'Blood Group',
};

const formatFieldName = (f) =>
  FIELD_LABELS[f] || String(f || '').replace(/([A-Z])/g, ' $1').trim();

const formatFieldValue = (field, val) => {
  if (val === null || val === undefined || val === '') return '—';
  if (field === 'dob') {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  return String(val);
};

const ManageProfileRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pending'); // 'pending' | 'history' | 'all'
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'approved' | 'rejected'
  const [search, setSearch] = useState('');

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState({
    open: false,
    request: null,
    status: 'approved',
    comment: '',
    submitting: false,
  });

  // Details Modal State
  const [detailModal, setDetailModal] = useState({
    open: false,
    request: null,
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/profile-requests');
      setRequests(asArray(data));
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load profile requests'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const res = { pending: 0, approved: 0, rejected: 0 };
    requests.forEach((r) => {
      if (res[r.status] !== undefined) res[r.status] += 1;
      else res[r.status] = 1;
    });
    return res;
  }, [requests]);

  const historyCount = (counts.approved || 0) + (counts.rejected || 0);

  const openDecisionModal = (request, status) => {
    setDecisionModal({
      open: true,
      request,
      status,
      comment: status === 'approved' ? 'Approved as requested' : '',
      submitting: false,
    });
  };

  const closeDecisionModal = () => {
    if (decisionModal.submitting) return;
    setDecisionModal({
      open: false,
      request: null,
      status: 'approved',
      comment: '',
      submitting: false,
    });
  };

  const submitDecision = async () => {
    if (!decisionModal.request) return;
    setDecisionModal((prev) => ({ ...prev, submitting: true }));
    try {
      const { data } = await api.put(`/api/profile-requests/${decisionModal.request._id}`, {
        status: decisionModal.status,
        adminComment: decisionModal.comment.trim(),
      });
      feedback.success(`Profile update ${decisionModal.status} and saved to history.`);
      setDecisionModal({
        open: false,
        request: null,
        status: 'approved',
        comment: '',
        submitting: false,
      });
      setRequests((prev) => prev.map((item) => (item._id === data._id ? { ...item, ...data } : item)));
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to process profile update request'));
      setDecisionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const filtered = useMemo(() => {
    return requests.filter((request) => {
      // Tab filtering
      if (tab === 'pending') {
        if (request.status !== 'pending') return false;
      } else if (tab === 'history') {
        if (request.status === 'pending') return false;
        if (historyFilter !== 'all' && request.status !== historyFilter) return false;
      } else if (tab === 'all') {
        if (historyFilter !== 'all' && request.status !== historyFilter) return false;
      }

      // Search filter
      const target = `${request.user?.name || ''} ${request.user?.employeeId || ''} ${request.user?.department || ''} ${request.field || ''
        } ${request.oldValue || ''} ${request.newValue || ''} ${request.reviewedBy?.name || ''} ${request.adminComment || ''
        }`.toLowerCase();
      return target.includes(search.toLowerCase());
    });
  }, [requests, tab, historyFilter, search]);

  const handleExport = () => {
    const exportData = filtered.map((r) => ({
      'Employee Name': r.user?.name || 'Staff Member',
      'Employee ID': r.user?.employeeId || '—',
      'Department': r.user?.department || '—',
      'Email': r.user?.email || '—',
      'Field Changed': formatFieldName(r.field),
      'Previous (Old) Value': formatFieldValue(r.field, r.oldValue),
      'New (Proposed) Value': formatFieldValue(r.field, r.newValue),
      'Status': (r.status || 'pending').toUpperCase(),
      'Requested On': r.createdAt ? new Date(r.createdAt).toLocaleString('en-GB') : '—',
      'Reviewed By': r.reviewedBy?.name || (r.status !== 'pending' ? 'Administrator' : '—'),
      'Reviewed On': r.reviewedAt
        ? new Date(r.reviewedAt).toLocaleString('en-GB')
        : r.status !== 'pending' && r.updatedAt
          ? new Date(r.updatedAt).toLocaleString('en-GB')
          : '—',
      'Admin Remarks': r.adminComment || '—',
    }));
    downloadCsv(`profile-change-${tab}.csv`, exportData);
  };

  if (loading && !requests.length) return <LoadingState label="Loading profile update queue…" />;
  if (error && !requests.length) return <ErrorState message={error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="Profile Change Requests & History"
        breadcrumbs={['HR Management', 'Profile Requests']}
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton
              icon={Download}
              disabled={!filtered.length}
              onClick={handleExport}
            >
              Export CSV
            </ToolbarButton>
          </div>
        }
      />

      {/* 2. Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard
          label="Pending Review"
          value={counts.pending || 0}
          helper="Awaiting HR approval"
          icon={Clock}
          tone="amber"
          onClick={() => {
            setTab('pending');
            setHistoryFilter('all');
          }}
          className="cursor-pointer hover:border-amber-300 transition-colors"
        />
        <MetricCard
          label="Approved Changes"
          value={counts.approved || 0}
          helper="Saved to profile history"
          icon={CheckCircle2}
          tone="green"
          onClick={() => {
            setTab('history');
            setHistoryFilter('approved');
          }}
          className="cursor-pointer hover:border-emerald-300 transition-colors"
        />
        <MetricCard
          label="Rejected Changes"
          value={counts.rejected || 0}
          helper="Declined change requests"
          icon={XCircle}
          tone="red"
          onClick={() => {
            setTab('history');
            setHistoryFilter('rejected');
          }}
          className="cursor-pointer hover:border-rose-300 transition-colors"
        />
        <MetricCard
          label="Change History Records"
          value={historyCount}
          helper="Total saved history logs"
          icon={History}
          tone="blue"
          onClick={() => {
            setTab('history');
            setHistoryFilter('all');
          }}
          className="cursor-pointer hover:border-blue-300 transition-colors"
        />
      </div>

      {/* 3. Section Navigation Tabs & Table Shell */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 pt-3.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setTab('pending');
                setHistoryFilter('all');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${tab === 'pending'
                  ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Clock size={14} className={tab === 'pending' ? 'text-amber-500' : 'text-slate-400'} />
              <span>Pending Requests</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab === 'pending'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
              >
                {counts.pending || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('history');
                setHistoryFilter('all');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${tab === 'history'
                  ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <History size={14} className={tab === 'history' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
              <span>Profile Change History</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab === 'history'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
              >
                {historyCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('all');
                setHistoryFilter('all');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${tab === 'all'
                  ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Users size={14} className={tab === 'all' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>All Logs</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab === 'all'
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
              >
                {requests.length}
              </span>
            </button>
          </div>

          {/* Right Toolbar / Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-56 sm:w-64">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search employee, field, admin…"
              />
            </div>

            {tab !== 'pending' && (
              <select
                className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors focus:outline-none cursor-pointer"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
              >
                <option value="all">All History</option>
                <option value="approved">Approved Changes</option>
                <option value="rejected">Rejected Changes</option>
              </select>
            )}

            {(search || (tab !== 'pending' && historyFilter !== 'all')) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setHistoryFilter('all');
                }}
                className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl px-2.5 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw size={13} className="text-slate-500" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Description Banner */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            {tab === 'pending' ? (
              <>
                <Clock size={13} className="text-amber-500" />
                <span>Showing requests requiring approval or rejection. Decisions are saved directly to profile change history.</span>
              </>
            ) : tab === 'history' ? (
              <>
                <History size={13} className="text-blue-500" />
                <span>Historical audit log of all completed profile modifications, review timestamps, and admin remarks.</span>
              </>
            ) : (
              <>
                <Users size={13} className="text-indigo-500" />
                <span>Complete archive of all pending and resolved profile change submissions.</span>
              </>
            )}
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length} entries</span>
        </div>

        {/* 4. Table Display */}
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-3 pl-4 sm:pl-5 pr-2.5">EMPLOYEE</th>
                  <th className="py-3 px-2.5">FIELD MODIFIED</th>
                  <th className="py-3 px-2.5">CHANGE DETAILS</th>
                  <th className="py-3 px-2.5">STATUS</th>
                  {tab !== 'pending' && <th className="py-3 px-2.5">REVIEWED BY &amp; WHEN</th>}
                  {tab !== 'pending' && <th className="py-3 px-2.5">ADMIN REMARKS</th>}
                  <th className="py-3 px-2.5">REQUESTED ON</th>
                  <th className="py-3 pr-4 sm:pr-5 pl-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filtered.map((request) => {
                  const isPending = request.status === 'pending';
                  const isApproved = request.status === 'approved';
                  const reviewerName = request.reviewedBy?.name || (isPending ? '—' : 'Administrator');
                  const reviewedDate = request.reviewedAt || request.updatedAt;

                  return (
                    <tr
                      key={request._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Employee Info */}
                      <td className="py-3 pl-4 sm:pl-5 pr-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar user={request.user} size="sm" />
                          <div>
                            <strong className="block text-slate-900 dark:text-white font-bold leading-tight">
                              {request.user?.name || 'Staff Member'}
                            </strong>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight mt-0.5">
                              {request.user?.employeeId || 'No ID'} • {request.user?.department || 'General'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Field Modified */}
                      <td className="py-3 px-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80">
                          <FileText size={12} className="text-slate-400" />
                          <span>{formatFieldName(request.field)}</span>
                        </span>
                      </td>

                      {/* Change Details (Old -> New) */}
                      <td className="py-3 px-2.5 max-w-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-mono line-through truncate max-w-[140px]"
                            title={String(request.oldValue ?? '')}
                          >
                            {formatFieldValue(request.field, request.oldValue)}
                          </span>
                          <ArrowRight size={12} className="text-slate-400 shrink-0" />
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold truncate max-w-[140px] ${isApproved
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : request.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              }`}
                            title={String(request.newValue ?? '')}
                          >
                            {formatFieldValue(request.field, request.newValue)}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-2.5">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock size={11} />
                            <span>Pending</span>
                          </span>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <Check size={11} />
                            <span>Approved</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <X size={11} />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      {/* Reviewed By & When (History view) */}
                      {tab !== 'pending' && (
                        <td className="py-3 px-2.5">
                          {!isPending ? (
                            <div>
                              <strong className="block text-slate-800 dark:text-slate-200 font-semibold leading-tight text-[11px]">
                                {reviewerName}
                              </strong>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight mt-0.5">
                                {reviewedDate ? formatDate(reviewedDate, { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Awaiting review</span>
                          )}
                        </td>
                      )}

                      {/* Admin Remarks (History view) */}
                      {tab !== 'pending' && (
                        <td className="py-3 px-2.5 max-w-[200px]">
                          {request.adminComment ? (
                            <p
                              className="text-xs text-slate-600 dark:text-slate-300 truncate font-normal"
                              title={request.adminComment}
                            >
                              {request.adminComment}
                            </p>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 text-[11px] italic">—</span>
                          )}
                        </td>
                      )}

                      {/* Requested Date */}
                      <td className="py-3 px-2.5 text-slate-500 dark:text-slate-400 text-[11px]">
                        {formatDate(request.createdAt, { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Action Column */}
                      <td className="py-3 pr-4 sm:pr-5 pl-2.5 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openDecisionModal(request, 'approved')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 text-xs font-semibold transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                              title="Approve this change"
                            >
                              <Check size={13} />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openDecisionModal(request, 'rejected')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 text-xs font-semibold transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
                              title="Reject this change"
                            >
                              <X size={13} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDetailModal({ open: true, request })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                            title="Inspect history log"
                          >
                            <Eye size={12} />
                            <span>View History</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              title={
                tab === 'pending'
                  ? 'No pending profile change requests'
                  : tab === 'history'
                    ? 'No profile change history found'
                    : 'No profile requests found'
              }
              message={
                search
                  ? `No entries match "${search}". Try resetting your search filter.`
                  : tab === 'pending'
                    ? 'All employee profile requests have been reviewed and saved to history.'
                    : 'Profile change history logs will appear here once requests are approved or rejected.'
              }
            />
          </div>
        )}

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {filtered.length} of {requests.length} total recorded requests
          </span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {counts.pending || 0} pending • {counts.approved || 0} approved • {counts.rejected || 0} rejected
          </span>
        </div>
      </div>

      {/* 5. Approve / Reject Decision Modal (with Remarks input saved to history) */}
      <Modal
        open={decisionModal.open}
        title={decisionModal.status === 'approved' ? 'Approve Profile Change' : 'Reject Profile Change'}
        subtitle={`This decision and your remarks will be permanently recorded in the profile change history.`}
        onClose={closeDecisionModal}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <ToolbarButton disabled={decisionModal.submitting} onClick={closeDecisionModal}>
              Cancel
            </ToolbarButton>
            <button
              type="button"
              disabled={decisionModal.submitting}
              onClick={submitDecision}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-xs cursor-pointer ${decisionModal.status === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60'
                  : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-60'
                }`}
            >
              {decisionModal.status === 'approved' ? <Check size={14} /> : <X size={14} />}
              <span>
                {decisionModal.submitting
                  ? 'Saving to History…'
                  : decisionModal.status === 'approved'
                    ? 'Confirm Approval & Save History'
                    : 'Confirm Rejection & Save History'}
              </span>
            </button>
          </div>
        }
      >
        {decisionModal.request && (
          <div className="space-y-4 text-xs">
            {/* Employee Summary Card */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar user={decisionModal.request.user} size="md" />
                <div>
                  <strong className="block text-sm text-slate-900 dark:text-white font-bold">
                    {decisionModal.request.user?.name || 'Staff Member'}
                  </strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {decisionModal.request.user?.employeeId || 'No ID'} • {decisionModal.request.user?.department || 'General'}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                {formatFieldName(decisionModal.request.field)}
              </span>
            </div>

            {/* Change Comparison (Old -> New) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-100/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                  Current Value
                </span>
                <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 break-words">
                  {formatFieldValue(decisionModal.request.field, decisionModal.request.oldValue)}
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border ${decisionModal.status === 'approved'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                  }`}
              >
                <span
                  className={`text-[11px] font-semibold block mb-1 uppercase tracking-wider ${decisionModal.status === 'approved' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}
                >
                  Proposed Change
                </span>
                <p
                  className={`text-xs font-mono font-bold break-words ${decisionModal.status === 'approved' ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
                    }`}
                >
                  {formatFieldValue(decisionModal.request.field, decisionModal.request.newValue)}
                </p>
              </div>
            </div>

            {/* Admin Remarks / Comments (Saved in history) */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Admin Remarks / Reason <span className="text-slate-400 font-normal">(Recorded in profile change history)</span>
              </label>
              <textarea
                rows={3}
                value={decisionModal.comment}
                onChange={(e) => setDecisionModal((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder={
                  decisionModal.status === 'approved'
                    ? 'e.g. Verified with official document, approved as requested.'
                    : 'e.g. Invalid document format provided, please submit a valid proof.'
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
              <p className="text-[11px] text-slate-400">
                This note will be saved in the permanent profile change history and notified to the employee.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. View Details / Audit History Modal */}
      <Modal
        open={detailModal.open}
        title="Profile Change Audit History"
        subtitle="Full historical record of this employee profile modification."
        onClose={() => setDetailModal({ open: false, request: null })}
        size="md"
        footer={
          <ToolbarButton onClick={() => setDetailModal({ open: false, request: null })}>
            Close
          </ToolbarButton>
        }
      >
        {detailModal.request && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar user={detailModal.request.user} size="lg" />
                <div>
                  <strong className="block text-sm font-bold text-slate-900 dark:text-white">
                    {detailModal.request.user?.name || 'Staff Member'}
                  </strong>
                  <span className="text-[11px] text-slate-500">
                    ID: {detailModal.request.user?.employeeId || '—'} • {detailModal.request.user?.email || '—'}
                  </span>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${detailModal.request.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                    : detailModal.request.status === 'rejected'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                  }`}
              >
                {detailModal.request.status === 'approved' ? (
                  <Check size={12} />
                ) : detailModal.request.status === 'rejected' ? (
                  <X size={12} />
                ) : (
                  <Clock size={12} />
                )}
                <span className="capitalize">{detailModal.request.status}</span>
              </span>
            </div>

            {/* Field & Value Comparison */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 text-xs">Field Modified</span>
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {formatFieldName(detailModal.request.field)}
                </strong>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">Previous Value</span>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs break-words">
                    {formatFieldValue(detailModal.request.field, detailModal.request.oldValue)}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">Updated Value</span>
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono text-xs font-semibold break-words">
                    {formatFieldValue(detailModal.request.field, detailModal.request.newValue)}
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Requested On</span>
                <strong className="text-xs text-slate-800 dark:text-slate-200 block">
                  {detailModal.request.createdAt ? formatDate(detailModal.request.createdAt, { hour: '2-digit', minute: '2-digit' }) : '—'}
                </strong>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Reviewed By</span>
                <strong className="text-xs text-slate-800 dark:text-slate-200 block">
                  {detailModal.request.reviewedBy?.name || 'Administrator'}
                </strong>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Decision Date</span>
                <strong className="text-xs text-slate-800 dark:text-slate-200 block">
                  {detailModal.request.reviewedAt || detailModal.request.updatedAt
                    ? formatDate(detailModal.request.reviewedAt || detailModal.request.updatedAt, { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </strong>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Audit Reference ID</span>
                <strong className="text-[11px] font-mono text-slate-600 dark:text-slate-400 block truncate">
                  {detailModal.request._id}
                </strong>
              </div>
            </div>

            {/* Admin Remarks */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">
                Admin Remarks / Comments
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-200 font-normal">
                {detailModal.request.adminComment || 'No admin remarks were recorded for this change.'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageProfileRequests;
