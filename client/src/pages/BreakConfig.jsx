import { useEffect, useState } from 'react';
import { Clock, Coffee, Edit2, Plus, Sparkles, Timer, Trash2 } from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const emptyBreak = () => ({
  id: crypto.randomUUID(),
  breakType: '',
  fromTime: '',
  toTime: '',
});

const displayTime = (value) =>
  value
    ? new Date(`2000-01-01T${value}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

const minutes = (item) => {
  if (!item.fromTime || !item.toTime) return 0;
  const [fh, fm] = item.fromTime.split(':').map(Number);
  const [th, tm] = item.toTime.split(':').map(Number);
  return Math.max(0, th * 60 + tm - fh * 60 - fm);
};

const BreakConfig = () => {
  const [breaks, setBreaks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [state, setState] = useState({ loading: true, error: '', saving: false });

  const load = async () => {
    setState({ loading: true, error: '', saving: false });
    try {
      const { data } = await api.get('/api/settings/breaks');
      setBreaks(asArray(data));
      setState({ loading: false, error: '', saving: false });
    } catch (error) {
      setState({
        loading: false,
        error: getApiError(error, 'Unable to load break configuration'),
        saving: false,
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const persist = async (next) => {
    setState((current) => ({ ...current, saving: true }));
    try {
      await api.post('/api/settings/breaks', next);
      setBreaks(next);
      setEditing(null);
      feedback.success('Break configuration saved.');
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to save break configuration'));
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
      feedback.error('Break end time must be after start time.');
      return;
    }
    const next = breaks.some((item) => item.id === editing.id)
      ? breaks.map((item) => (item.id === editing.id ? editing : item))
      : [...breaks, editing];
    persist(next.sort((a, b) => a.fromTime.localeCompare(b.fromTime)));
  };

  const remove = async (item) => {
    const accepted = await feedback.confirm(`Delete ${item.breakType}?`, {
      title: 'Delete break type',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (accepted) persist(breaks.filter((entry) => entry.id !== item.id));
  };

  if (state.loading) return <LoadingState label="Loading break policy…" />;
  if (state.error) return <ErrorState message={state.error} retry={load} />;

  const totalMinutes = breaks.reduce((sum, item) => sum + minutes(item), 0);

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header */}
      <PageHeader
        title="Break Configuration"
        breadcrumbs={['System & Config', 'Break Configuration']}
        actions={
          <ToolbarButton primary icon={Plus} onClick={() => setEditing(emptyBreak())}>
            Add Break Type
          </ToolbarButton>
        }
      />

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <MetricCard
          label="Configured Breaks"
          value={breaks.length}
          helper="Defined daily break slots"
          icon={Coffee}
          tone="blue"
        />
        <MetricCard
          label="Total Allotted Duration"
          value={`${totalMinutes} mins`}
          helper={`${(totalMinutes / 60).toFixed(1)} hours combined`}
          icon={Timer}
          tone="green"
        />
        <MetricCard
          label="Policy Status"
          value="Active"
          helper="Applied to all daily logical shifts"
          icon={Sparkles}
          tone="purple"
        />
      </div>

      {/* 3. Table */}
      <TableShell
        title="Scheduled Break Types"
        summary="Standard break windows configured for employee shifts."
        footer={<span>Showing {breaks.length} configured break types</span>}
      >
        {breaks.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">BREAK NAME</th>
                <th className="py-2.5 px-2.5">START TIME</th>
                <th className="py-2.5 px-2.5">END TIME</th>
                <th className="py-2.5 px-2.5">ALLOTTED DURATION</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {breaks.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 pl-4 sm:pl-5 pr-2.5 font-semibold text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Coffee size={15} />
                      </div>
                      <span>{item.breakType}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400" />
                      <span>{displayTime(item.fromTime)}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400" />
                      <span>{displayTime(item.toTime)}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                      {minutes(item)} mins
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing({ ...item })}
                        className="p-1.5 rounded-lg border border-slate-200/80 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-colors cursor-pointer"
                        title="Edit break"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        className="p-1.5 rounded-lg border border-slate-200/80 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 transition-colors cursor-pointer"
                        title="Delete break"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No break types configured"
            message="Add standard lunch or tea breaks to allow employees to punch in/out of breaks."
          />
        )}
      </TableShell>

      {/* 4. Modal */}
      <Modal
        open={Boolean(editing)}
        title="Break Window"
        subtitle="Configure a standard reusable break interval."
        onClose={() => setEditing(null)}
        size="sm"
        footer={
          <>
            <ToolbarButton onClick={() => setEditing(null)}>Cancel</ToolbarButton>
            <ToolbarButton primary disabled={state.saving} onClick={save}>
              {state.saving ? 'Saving…' : 'Save Break'}
            </ToolbarButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Break Name</label>
            <input
              type="text"
              placeholder="e.g. Lunch Break, Tea Break"
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              value={editing?.breakType || ''}
              onChange={(e) => setEditing({ ...editing, breakType: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Start Time</label>
              <input
                type="time"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                value={editing?.fromTime || ''}
                onChange={(e) => setEditing({ ...editing, fromTime: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">End Time</label>
              <input
                type="time"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                value={editing?.toTime || ''}
                onChange={(e) => setEditing({ ...editing, toTime: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BreakConfig;
