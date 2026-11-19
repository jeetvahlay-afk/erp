import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Calendar,
  CalendarClock,
  CalendarDays,
  Check,
  CircleX,
  Download,
  RotateCcw,
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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
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

  const filtered = useMemo(() => {
    return leaves.filter((leave) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        [leave.user?.name, leave.user?.employeeId, leave.user?.department, leave.leaveType].some(
          (value) => String(value || '').toLowerCase().includes(query)
        );
      return matchesSearch && (!status || leave.status === status) && (!type || leave.leaveType === type);
    });
  }, [leaves, search, status, type]);

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
    setStatus('');
    setType('');
  };

  if (loading) return <LoadingState label="Loading leave approvals…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  const counts = leaves.reduce((map, leave) => {
    map[leave.status] = (map[leave.status] || 0) + 1;
    return map;
  }, {});

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header */}
      <PageHeader
        title="Leave Management"
        breadcrumbs={['Attendance & Leaves', 'Leave Management']}
        actions={
          <ToolbarButton icon={Download} onClick={() => downloadCsv('leave-management.csv', filtered)}>
            Export CSV
          </ToolbarButton>
        }
      />

      {/* 2. Top 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard
          label="Pending Requests"
          value={counts.Pending || 0}
          helper="Awaiting management decision"
          icon={CalendarClock}
          tone="amber"
        />
        <MetricCard
          label="Approved Requests"
          value={counts.Approved || 0}
          helper="Approved leave workflow"
          icon={BadgeCheck}
          tone="green"
        />
        <MetricCard
          label="Rejected Requests"
          value={counts.Rejected || 0}
          helper="Rejected leave applications"
          icon={CircleX}
          tone="red"
        />
        <MetricCard
          label="Total Requests"
          value={leaves.length}
          helper="All recorded leave requests"
          icon={CalendarDays}
          tone="blue"
        />
      </div>

      {/* 3. Table with Toolbar */}
      <TableShell
        title="Leave Applications"
        summary={`${filtered.length} matching applications`}
        toolbar={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search employee, leave type..."
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
            <select
              className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
            {(search || status || type) && (
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
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((leave) => {
                const days =
                  Math.floor((new Date(leave.endDate) - new Date(leave.startDate)) / 86400000) + 1;
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

                    {/* Action */}
                    <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                      {leave.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDecision(leave, 'Approved')}
                            className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Approve leave"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDecision(leave, 'Rejected')}
                            className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Reject leave"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Processed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No leave requests found"
            message="No leave requests match the current filters."
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