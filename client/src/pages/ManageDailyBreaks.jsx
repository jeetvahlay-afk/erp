import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  Clock3,
  Coffee,
  Edit2,
  Layers3,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  Avatar,
  EmptyState,
  ErrorState,
  formatDate,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const today = new Date().toLocaleDateString('en-CA');
const emptyBreak = () => ({ id: crypto.randomUUID(), breakType: '', fromTime: '', toTime: '' });
const displayTime = (value) =>
  value
    ? new Date(`2000-01-01T${value}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

const ManageDailyBreaks = () => {
  const [selectedDate, setSelectedDate] = useState(today);
  const [breaks, setBreaks] = useState([]);
  const [isCustom, setIsCustom] = useState(false);
  const [requests, setRequests] = useState([]);
  const [editing, setEditing] = useState(null);
  const [state, setState] = useState({ loading: true, error: '', saving: false, processing: '' });

  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [scheduleResponse, requestResponse] = await Promise.all([
        api.get(`/api/daily-breaks?date=${selectedDate}`),
        api.get('/api/break-requests'),
      ]);
      setBreaks(asArray(scheduleResponse.data.breaks));
      setIsCustom(Boolean(scheduleResponse.data.isCustom));
      setRequests(asArray(requestResponse.data));
      setState({ loading: false, error: '', saving: false, processing: '' });
    } catch (error) {
      setState({
        loading: false,
        error: getApiError(error, 'Unable to load daily breaks'),
        saving: false,
        processing: '',
      });
    }
  };

  useEffect(() => {
    load();
  }, [selectedDate]);

  const persist = async (next) => {
    setState((current) => ({ ...current, saving: true }));
    try {
      await api.post('/api/daily-breaks', { date: selectedDate, breaks: next });
      setBreaks(next);
      setIsCustom(true);
      setEditing(null);
      feedback.success('Daily break schedule saved.');
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to save daily break schedule'));
    } finally {
      setState((current) => ({ ...current, saving: false }));
    }
  };

  const save = () => {
    if (!editing.breakType.trim() || !editing.fromTime || !editing.toTime) {
      feedback.error('Break name and time window are required.');
      return;
    }
    if (editing.fromTime >= editing.toTime) {
      feedback.error('End time must be after start time.');
      return;
    }
    const next = breaks.some((item) => item.id === editing.id)
      ? breaks.map((item) => (item.id === editing.id ? editing : item))
      : [...breaks, editing];
    persist(next.sort((a, b) => a.fromTime.localeCompare(b.fromTime)));
  };

  const remove = async (item) => {
    const accepted = await feedback.confirm(`Remove ${item.breakType} from ${selectedDate}?`, {
      title: 'Remove daily break',
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (accepted) persist(breaks.filter((entry) => entry.id !== item.id));
  };

  const revert = async () => {
    const accepted = await feedback.confirm(`Use the global break plan for ${selectedDate}?`, {
      title: 'Revert schedule',
      confirmLabel: 'Revert',
    });
    if (!accepted) return;
    setState((current) => ({ ...current, saving: true }));
    try {
      await api.delete(`/api/daily-breaks?date=${selectedDate}`);
      feedback.success('Daily override removed.');
      load();
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to revert schedule'));
      setState((current) => ({ ...current, saving: false }));
    }
  };

  const decide = async (request, status) => {
    setState((current) => ({ ...current, processing: request._id }));
    try {
      await api.put(`/api/break-requests/${request._id}`, { status });
      feedback.success(`Break request ${status}.`);
      load();
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to update request'));
      setState((current) => ({ ...current, processing: '' }));
    }
  };

  const sortedRequests = useMemo(
    () =>
      [...requests].sort((a, b) => {
        const priority = Number(b.status === 'pending') - Number(a.status === 'pending');
        return priority || new Date(b.createdAt) - new Date(a.createdAt);
      }),
    [requests]
  );

  if (state.loading) return <LoadingState label="Loading daily break administration…" />;
  if (state.error) return <ErrorState message={state.error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      <PageHeader
        title="Daily Break Administration"
        breadcrumbs={['Administration', 'Daily Breaks']}
        actions={
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            />
            <ToolbarButton icon={RefreshCw} disabled={!isCustom || state.saving} onClick={revert}>
              Use Global Plan
            </ToolbarButton>
            <ToolbarButton primary icon={Plus} onClick={() => setEditing(emptyBreak())}>
              Add Break
            </ToolbarButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Break Windows */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coffee size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Break Schedule</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatDate(selectedDate)} · {isCustom ? 'Custom Daily Override' : 'Inherited Global Policy'}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isCustom
                  ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                  : 'bg-blue-50 text-blue-700 border border-blue-200/60'
              }`}
            >
              {isCustom ? 'Daily Override' : 'Global Default'}
            </span>
          </div>

          <div className="p-5">
            {breaks.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {breaks.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-amber-600 flex items-center justify-center shrink-0">
                        <Coffee size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{item.breakType}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock3 size={11} />
                          {displayTime(item.fromTime)} – {displayTime(item.toTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing({ ...item })}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No Break Windows"
                message="Add a break window for this date or keep standard workforce defaults."
                action={<Coffee size={24} className="text-slate-300 mx-auto" />}
              />
            )}
          </div>
        </div>

        {/* Right: Policy & Stats */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Schedule Details</h3>
          <div className="space-y-3 divide-y divide-slate-100">
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500 flex items-center gap-2">
                <CalendarDays size={14} className="text-slate-400" /> Date
              </span>
              <span className="text-xs font-semibold text-slate-800">{formatDate(selectedDate)}</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-xs text-slate-500 flex items-center gap-2">
                <Layers3 size={14} className="text-slate-400" /> Source
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {isCustom ? 'Daily Override' : 'Global Policy'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-xs text-slate-500 flex items-center gap-2">
                <Coffee size={14} className="text-slate-400" /> Windows
              </span>
              <span className="text-xs font-semibold text-blue-600">{breaks.length} configured</span>
            </div>
          </div>
        </div>
      </div>

      {/* Break Requests Table */}
      <TableShell
        title="Employee Break Requests"
        summary={`${sortedRequests.length} total ad-hoc break submissions`}
      >
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Reason / Type</th>
                <th className="py-3 px-4">Requested Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No break requests submitted yet.
                  </td>
                </tr>
              ) : (
                sortedRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar user={req.user || { name: 'Staff' }} size="xs" />
                        <div>
                          <strong className="block text-slate-900 font-semibold">
                            {req.user?.name || 'Staff Member'}
                          </strong>
                          <span className="text-[11px] text-slate-400">
                            {req.user?.employeeId || 'ID Pending'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{req.reason || req.breakType || 'Break'}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(req.date || req.createdAt)} · {displayTime(req.fromTime)} -{' '}
                      {displayTime(req.toTime)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge tone={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}>
                        {req.status || 'Pending'}
                      </StatusBadge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {req.status === 'pending' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={state.processing === req._id}
                            onClick={() => decide(req, 'approved')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={state.processing === req._id}
                            onClick={() => decide(req, 'rejected')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">Decided</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TableShell>

      {/* Edit/Create Modal */}
      {editing && (
        <Modal
          open={Boolean(editing)}
          title={breaks.some((item) => item.id === editing.id) ? 'Edit Break Window' : 'Add Break Window'}
          subtitle={formatDate(selectedDate)}
          onClose={() => setEditing(null)}
          size="sm"
          footer={
            <>
              <ToolbarButton onClick={() => setEditing(null)}>Cancel</ToolbarButton>
              <ToolbarButton primary icon={Coffee} disabled={state.saving} onClick={save}>
                {state.saving ? 'Saving…' : 'Save Break'}
              </ToolbarButton>
            </>
          }
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Break Name *</label>
              <input
                value={editing.breakType}
                onChange={(e) => setEditing({ ...editing, breakType: e.target.value })}
                placeholder="e.g. Lunch Break, Afternoon Tea"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Start Time *</label>
                <input
                  type="time"
                  value={editing.fromTime}
                  onChange={(e) => setEditing({ ...editing, fromTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">End Time *</label>
                <input
                  type="time"
                  value={editing.toTime}
                  onChange={(e) => setEditing({ ...editing, toTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ManageDailyBreaks;
