import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Calendar,
  CalendarClock,
  Check,
  CircleX,
  Clock,
  Download,
  History,
  RotateCcw,
  Users,
  X,
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
  MetricCard,
  Modal,
  PageHeader,
  SearchInput,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const ManageLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [tab, setTab] = useState('pending'); // 'pending' | 'history' | 'all'
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'Approved' | 'Rejected'
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState('Approved');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/leaves');
      setLeaves(asArray(data));
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load leave requests'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const res = { Pending: 0, Approved: 0, Rejected: 0 };
    leaves.forEach((leave) => {
      if (res[leave.status] !== undefined) res[leave.status] += 1;
      else res[leave.status] = 1;
    });
    return res;
  }, [leaves]);

  const historyCount = (counts.Approved || 0) + (counts.Rejected || 0);

  const filtered = useMemo(() => {
    return leaves.filter((leave) => {
      if (tab === 'pending') {
        if (leave.status !== 'Pending') return false;
      } else if (tab === 'history') {
        if (leave.status === 'Pending') return false;
        if (historyFilter !== 'all' && leave.status !== historyFilter) return false;
      }

      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        [leave.user?.name, leave.user?.employeeId, leave.user?.department, leave.leaveType, leave.reason, leave.adminResponse].some(
          (value) => String(value || '').toLowerCase().includes(query)
        );
      return matchesSearch && (!type || leave.leaveType === type);
    });
  }, [leaves, tab, historyFilter, search, type]);

  const openDecision = (leave, action) => {
    setSelected(leave);
    setDecision(action);
    setResponse(leave.adminResponse || '');
  };

  const decide = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/leaves/${selected._id}/status`, {
        status: decision,
        adminResponse: response,
      });
      feedback.success(`Leave request ${decision.toLowerCase()}`);
      setSelected(null);
      setResponse('');
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to process leave request'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setType('');
    setHistoryFilter('all');
  };

  if (loading) return <LoadingState label="Loading leave approvals…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header */}
      <PageHeader
        title="Leave Management"
        breadcrumbs={['Attendance & Leaves', 'Leave Management']}
        actions={
          <ToolbarButton icon={Download} onClick={() => downloadCsv(`leave-${tab}.csv`, filtered)}>
            Export CSV
          </ToolbarButton>
        }
      />

      {/* 2. Top 4 Metric KPI Cards with Quick Tab Select */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard
          label="Pending Requests"
          value={counts.Pending || 0}
          helper="Awaiting your approval or rejection"
          icon={CalendarClock}
          tone="amber"
          onClick={() => {
            setTab('pending');
            setHistoryFilter('all');
          }}
          className="cursor-pointer hover:border-amber-300 transition-colors"
        />
        <MetricCard
          label="Approved Requests"
          value={counts.Approved || 0}
          helper="Successfully approved leaves"
          icon={BadgeCheck}
          tone="green"
          onClick={() => {
            setTab('history');
            setHistoryFilter('Approved');
          }}
          className="cursor-pointer hover:border-emerald-300 transition-colors"
        />
        <MetricCard
          label="Rejected Requests"
          value={counts.Rejected || 0}
          helper="Declined leave applications"
          icon={CircleX}
          tone="red"
          onClick={() => {
            setTab('history');
            setHistoryFilter('Rejected');
          }}
          className="cursor-pointer hover:border-rose-300 transition-colors"
        />
        <MetricCard
          label="Leave History Records"
          value={historyCount}
          helper="All decided leave applications"
          icon={History}
          tone="blue"
          onClick={() => {
            setTab('history');
            setHistoryFilter('all');
          }}
          className="cursor-pointer hover:border-blue-300 transition-colors"
        />
      </div>

      {/* 3. Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTab('pending');
              setHistoryFilter('all');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'pending'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={14} className={tab === 'pending' ? 'text-amber-500' : 'text-slate-400'} />
            <span>Pending Requests</span>
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                tab === 'pending'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {counts.Pending || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('history');
              setHistoryFilter('all');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'history'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History size={14} className={tab === 'history' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Leave History</span>
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                tab === 'history'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-200 text-slate-700'
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
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={14} className={tab === 'all' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>All Requests</span>
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                tab === 'all'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {leaves.length}
            </span>
          </button>
        </div>

        {tab === 'history' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">History Filter:</span>
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="bg-white border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
            >
              <option value="all">All History ({historyCount})</option>
              <option value="Approved">Approved Leaves ({counts.Approved || 0})</option>
              <option value="Rejected">Rejected Leaves ({counts.Rejected || 0})</option>
            </select>
          </div>
        )}
      </div>

      {/* 4. Table Shell with Content */}
      <TableShell
        title={
          tab === 'pending'
            ? `Pending Leave Requests (${filtered.length})`
            : tab === 'history'
            ? `Leave Decision History (${filtered.length})`
            : `All Leave Applications (${filtered.length})`
        }
        summary={
          tab === 'pending'
            ? 'Requests awaiting management approval or rejection'
            : tab === 'history'
            ? 'Archived record of approved and rejected leave applications'
            : 'Complete directory of all employee leave applications'
        }
        toolbar={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search employee, leave type, reason..."
            />
            <select
              className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All Leave Types</option>
              {['Sick Leave', 'Casual Leave', 'Paid Leave', 'Unpaid Leave', 'Birthday Leave'].map(
                (item) => (
                  <option key={item}>{item}</option>
                )
              )}
            </select>
            {(search || type || (tab === 'history' && historyFilter !== 'all')) && (
              <button
                type="button"
                onClick={resetFilters}
                className="border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} className="text-slate-500" />
                <span>Reset</span>
              </button>
            )}
          </>
        }
        footer={<span>Showing {filtered.length} entries</span>}
      >
        {filtered.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">EMPLOYEE</th>
                <th className="py-2.5 px-2.5">LEAVE TYPE</th>
                <th className="py-2.5 px-2.5">FROM</th>
                <th className="py-2.5 px-2.5">TO</th>
                <th className="py-2.5 px-2.5">DAYS</th>
                <th className="py-2.5 px-2.5">REASON</th>
                <th className="py-2.5 px-2.5">STATUS</th>
                {tab !== 'pending' && <th className="py-2.5 px-2.5">ADMIN REMARKS</th>}
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                  {tab === 'pending' ? 'DECISION' : 'PROCESSED'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((leave) => {
                const days =
                  Math.floor((new Date(leave.endDate) - new Date(leave.startDate)) / 86400000) + 1;
                const isPending = leave.status === 'Pending';

                return (
                  <tr key={leave._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Employee */}
                    <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar user={leave.user} size="sm" />
                        <div>
                          <strong className="text-slate-900 block font-semibold leading-tight">
                            {leave.user?.name}
                          </strong>
                          <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">
                            {leave.user?.department || leave.user?.employeeId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Leave Type */}
                    <td className="py-2.5 px-2.5 font-medium text-slate-700">{leave.leaveType}</td>

                    {/* From */}
                    <td className="py-2.5 px-2.5 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{formatDate(leave.startDate)}</span>
                      </div>
                    </td>

                    {/* To */}
                    <td className="py-2.5 px-2.5 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{formatDate(leave.endDate)}</span>
                      </div>
                    </td>

                    {/* Days */}
                    <td className="py-2.5 px-2.5 font-semibold text-slate-800">{days}</td>

                    {/* Reason */}
                    <td className="py-2.5 px-2.5 max-w-[200px] text-slate-600 truncate">
                      {leave.reason || '—'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-2.5">
                      <StatusBadge>{leave.status}</StatusBadge>
                    </td>

                    {/* Admin remarks in history / all */}
                    {tab !== 'pending' && (
                      <td className="py-2.5 px-2.5 max-w-[200px] text-slate-600 truncate">
                        {leave.adminResponse || '—'}
                      </td>
                    )}

                    {/* Action or Processed indicator */}
                    <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDecision(leave, 'Approved')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer text-xs font-semibold"
                            title="Approve leave"
                          >
                            <Check size={13} /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openDecision(leave, 'Rejected')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer text-xs font-semibold"
                            title="Reject leave"
                          >
                            <X size={13} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                          {formatDate(leave.updatedAt || leave.createdAt)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title={
              tab === 'pending'
                ? 'No pending leave requests'
                : tab === 'history'
                ? 'No leave history found'
                : 'No leave applications found'
            }
            message={
              tab === 'pending'
                ? 'All employee leave applications have been reviewed.'
                : 'No past leave records match the selected filters.'
            }
          />
        )}
      </TableShell>

      {/* Approve / Reject Modal */}
      <Modal
        open={Boolean(selected)}
        title={`${decision === 'Approved' ? 'Approve' : 'Reject'} Leave Request`}
        subtitle={selected ? `${selected.user?.name} · ${selected.leaveType}` : ''}
        onClose={() => setSelected(null)}
        footer={
          <>
            <ToolbarButton onClick={() => setSelected(null)}>Cancel</ToolbarButton>
            <ToolbarButton
              primary={decision === 'Approved'}
              danger={decision === 'Rejected'}
              disabled={submitting}
              onClick={decide}
            >
              {submitting ? 'Saving…' : decision}
            </ToolbarButton>
          </>
        }
      >
        {selected?.reason && (
          <div className="mb-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Employee Reason
            </span>
            <p className="text-xs text-slate-700 m-0">{selected.reason}</p>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Response to Employee (Optional)
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Add a note or instruction for the employee..."
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </Modal>
    </div>
  );
};

export default ManageLeaves;