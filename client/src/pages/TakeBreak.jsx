import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Coffee, History, Plus, Square, Timer } from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { feedback } from '../lib/feedback';
import { getLogicalDateString } from '../utils/date';
import {
  EmptyState,
  ErrorState,
  formatDate,
  formatTime,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const secondsLabel = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const calculateLimit = (item) => {
  if (!item.fromTime || !item.toTime) return Number(item.limit || 15);
  const [fh, fm] = item.fromTime.split(':').map(Number);
  const [th, tm] = item.toTime.split(':').map(Number);
  let result = th * 60 + tm - (fh * 60 + fm);
  if (result < 0) result += 1440;
  return result;
};

const TakeBreak = () => {
  const { activeBreak, startBreakTimer, endBreakTimer, timeLeft, elapsedExceeded, elapsedSeconds, attendanceStatus } = useAuth();
  const [data, setData] = useState({ breaks: [], history: [], requests: [] });
  const [state, setState] = useState({ loading: true, error: '', submitting: false });
  const [pending, setPending] = useState(null);
  const [endBreakModalOpen, setEndBreakModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState({ reason: '', requestedDuration: 15 });

  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const calDate = new Date().toLocaleDateString('en-CA');
      const logicalDate = getLogicalDateString();
      const [scheduleResponse, historyResponse, requestResponse] = await Promise.all([
        api.get(`/api/daily-breaks?date=${calDate}`).then(async (res) => {
          if (!res.data?.breaks?.length && calDate !== logicalDate) {
            try {
              const altRes = await api.get(`/api/daily-breaks?date=${logicalDate}`);
              if (altRes.data?.breaks?.length) return altRes;
            } catch {
              // keep initial response
            }
          }
          return res;
        }),
        api.get(`/api/breaks/my-breaks?date=${logicalDate}`),
        api.get('/api/break-requests/my-requests'),
      ]);
      setData({
        breaks: (scheduleResponse.data.breaks || []).map((item) => ({
          ...item,
          calculatedLimit: calculateLimit(item),
        })),
        history: asArray(historyResponse.data),
        requests: asArray(requestResponse.data),
      });
      setState({ loading: false, error: '', submitting: false });
    } catch (error) {
      setState({
        loading: false,
        error: getApiError(error, 'Unable to load break information'),
        submitting: false,
      });
    }
  };

  useEffect(() => {
    load();
    const handleBreaksUpdated = () => load();
    window.addEventListener('teamhub:breaks-updated', handleBreaksUpdated);
    return () => window.removeEventListener('teamhub:breaks-updated', handleBreaksUpdated);
  }, []);

  useEffect(() => {
    load();
  }, [activeBreak?._id]);

  const isTaken = (item) =>
    data.history.some(
      (entry) =>
        entry.breakType === `${item.breakType} [${item.fromTime}-${item.toTime}]` ||
        entry.breakType === item.breakType ||
        (item.breakType && entry.breakType?.startsWith(item.breakType))
    );

  const totalBreakMinutesToday = useMemo(() => {
    return data.history.reduce((sum, item) => {
      if (item.status === 'Ongoing') {
        const liveMins = Math.max(1, Math.ceil((elapsedSeconds || 1) / 60));
        return sum + liveMins;
      }
      return sum + Number(item.actualDuration || 0);
    }, 0);
  }, [data.history, elapsedSeconds]);

  const approvedRequests = useMemo(
    () => data.requests.filter((requestItem) => String(requestItem.status).toLowerCase() === 'approved' && !requestItem.isUsed),
    [data.requests]
  );

  const start = async () => {
    if (!attendanceStatus?.isPunchedIn) {
      feedback.warning('You must check in for your shift before taking a break.');
      setPending(null);
      return;
    }
    if (!pending || !password) {
      feedback.error('Enter your password to verify this break action.');
      return;
    }
    setState((current) => ({ ...current, submitting: true }));
    try {
      await api.post('/api/auth/verify', { password });
      const breakType = pending.fromTime
        ? `${pending.breakType} [${pending.fromTime}-${pending.toTime}]`
        : pending.breakType;
      const { data: breakLog } = await api.post('/api/breaks/start', {
        breakType,
        allottedDuration: pending.calculatedLimit,
        requestId: pending.requestId,
        password,
      });
      startBreakTimer(breakLog);
      setPending(null);
      setPassword('');
      window.dispatchEvent(new CustomEvent('teamhub:breaks-updated'));
      feedback.success('Break started.');
      load();
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to start break'));
    } finally {
      setState((current) => ({ ...current, submitting: false }));
    }
  };

  const handleOpenEndBreak = () => {
    setPassword('');
    setEndBreakModalOpen(true);
  };

  const confirmEndBreak = async () => {
    if (!password) {
      feedback.error('Enter your password to verify ending your break.');
      return;
    }
    setState((current) => ({ ...current, submitting: true }));
    try {
      await api.post('/api/auth/verify', { password });
      await api.put(`/api/breaks/end/${activeBreak._id}`, { password });
      endBreakTimer();
      setEndBreakModalOpen(false);
      setPassword('');
      window.dispatchEvent(new CustomEvent('teamhub:breaks-updated'));
      feedback.success('Break ended. Welcome back to work!');
      load();
    } catch (error) {
      feedback.error(getApiError(error, 'Verification failed. Incorrect password.'));
    } finally {
      setState((current) => ({ ...current, submitting: false }));
    }
  };

  const submitRequest = async () => {
    if (!request.reason.trim() || !password) {
      feedback.error('Reason and password are required.');
      return;
    }
    setState((current) => ({ ...current, submitting: true }));
    try {
      await api.post('/api/auth/verify', { password });
      await api.post('/api/break-requests', request);
      feedback.success('Custom break request submitted.');
      setRequestOpen(false);
      setRequest({ reason: '', requestedDuration: 15 });
      setPassword('');
      load();
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to submit break request'));
    } finally {
      setState((current) => ({ ...current, submitting: false }));
    }
  };

  if (state.loading) return <LoadingState label="Loading break schedule…" />;
  if (state.error) return <ErrorState message={state.error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="My Breaks"
        breadcrumbs={['Self Service', 'My Breaks']}
        actions={
          <ToolbarButton
            primary
            icon={Plus}
            onClick={() => {
              setPassword('');
              setRequestOpen(true);
            }}
          >
            Request Custom Break
          </ToolbarButton>
        }
      />

      {/* 2. Top Row: Active Break & Available Breaks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-4.5 items-stretch">
        {/* Active Break Panel */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
              <span>{activeBreak ? 'Active Break' : 'Break Status'}</span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Today: {totalBreakMinutesToday}m
              </span>
            </h2>
            {activeBreak ? (
              <div className="flex flex-col items-center justify-center p-4 sm:p-5 text-center gap-2.5 bg-blue-50/50 dark:bg-slate-700/40 rounded-xl border border-blue-100 dark:border-slate-600">
                <div className="w-12 h-12 rounded-xl bg-[var(--erp-primary,#2563eb)] text-white flex items-center justify-center shadow-md">
                  <Timer size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Break Time Taken
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white">
                    {secondsLabel(elapsedSeconds)}
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
                    {elapsedExceeded
                      ? `Overtime: +${secondsLabel(elapsedExceeded)}`
                      : `Time Left: ${secondsLabel(timeLeft)}`}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{activeBreak.breakType}</p>
                <StatusBadge tone={elapsedExceeded ? 'danger' : 'success'}>
                  {elapsedExceeded ? 'Overtime' : 'In Progress'}
                </StatusBadge>
                <div className="mt-2">
                  <ToolbarButton danger icon={Square} onClick={handleOpenEndBreak}>
                    End Break
                  </ToolbarButton>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No active break"
                message="Select an available scheduled or approved custom break to begin."
              />
            )}
          </div>
        </div>

        {/* Available Breaks Panel */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <div className="mb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Available Breaks</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Scheduled break windows for the current logical shift day.
            </p>
          </div>

          {data.breaks.length || approvedRequests.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.breaks.map((item) => {
                const taken = isTaken(item);
                return (
                  <button
                    type="button"
                    key={item.id}
                    disabled={taken || Boolean(activeBreak) || !attendanceStatus?.isPunchedIn}
                    onClick={() => {
                      if (!attendanceStatus?.isPunchedIn) {
                        feedback.warning('You must check in for your shift before taking a break.');
                        return;
                      }
                      setPassword('');
                      setPending(item);
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      taken || !attendanceStatus?.isPunchedIn
                        ? 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Coffee size={18} />
                      </div>
                      <div className="min-w-0">
                        <strong className="block text-xs font-bold text-slate-900 truncate">
                          {item.breakType}
                        </strong>
                        <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                          {item.fromTime || 'Flexible'} – {item.toTime || `${item.calculatedLimit}m`}
                        </span>
                      </div>
                    </div>
                    <StatusBadge tone={taken ? 'success' : 'info'}>
                      {taken ? 'Taken' : `${item.calculatedLimit} min`}
                    </StatusBadge>
                  </button>
                );
              })}

              {approvedRequests.map((item) => (
                <button
                  type="button"
                  key={item._id}
                  disabled={Boolean(activeBreak) || !attendanceStatus?.isPunchedIn}
                  onClick={() => {
                    if (!attendanceStatus?.isPunchedIn) {
                      feedback.warning('You must check in for your shift before taking a break.');
                      return;
                    }
                    setPassword('');
                    setPending({
                      breakType: `Custom: ${item.reason}`,
                      calculatedLimit: item.requestedDuration,
                      requestId: item._id,
                    });
                  }}
                  className={`flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 text-left transition-all shadow-2xs ${
                    !attendanceStatus?.isPunchedIn ? 'opacity-60 cursor-not-allowed' : 'hover:bg-emerald-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <AlertTriangle size={17} />
                    </div>
                    <div className="min-w-0">
                      <strong className="block text-xs font-bold text-slate-900 truncate">
                        {item.reason}
                      </strong>
                      <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                        Approved custom break
                      </span>
                    </div>
                  </div>
                  <StatusBadge tone="success">{item.requestedDuration} min</StatusBadge>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No breaks available"
              message="No break windows or approved custom requests are scheduled for today."
            />
          )}
        </div>
      </div>

      {/* 3. Bottom Row: Break History & Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-4.5">
        {/* Today's Break History */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Today’s Break History</h2>
            <History size={16} className="text-slate-400" />
          </div>

          {data.history.length ? (
            <div className="divide-y divide-slate-100">
              {data.history.map((item) => (
                <div key={item._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Coffee size={15} />
                    </div>
                    <div>
                      <strong className="block text-slate-900 font-bold">{item.breakType}</strong>
                      <span className="text-[11px] text-slate-500">
                        {formatTime(item.startTime)} – {formatTime(item.endTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.status === 'Ongoing'
                        ? `${Math.max(1, Math.ceil((elapsedSeconds || 1) / 60))} min (live)`
                        : `${item.actualDuration || 0} min`}
                    </span>
                    <StatusBadge
                      tone={
                        item.isExceeded ? 'danger' : item.status === 'Ongoing' ? 'warning' : 'success'
                      }
                    >
                      {item.status}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No breaks recorded today" />
          )}
        </div>

        {/* Custom Request History */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3">Custom Request History</h2>

          {data.requests.length ? (
            <div className="divide-y divide-slate-100">
              {data.requests.slice(0, 8).map((item) => (
                <div key={item._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <strong className="block text-slate-900 font-bold">{item.reason}</strong>
                    <span className="text-[11px] text-slate-500">
                      {item.requestedDuration} mins · {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <StatusBadge>{item.status}</StatusBadge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No custom requests" />
          )}
        </div>
      </div>

      {/* Start Break Password Modal */}
      <Modal
        open={Boolean(pending)}
        title="Verify Break Start"
        subtitle={`${pending?.breakType || ''} · ${pending?.calculatedLimit || 0} minutes`}
        onClose={() => setPending(null)}
        size="sm"
        footer={
          <>
            <ToolbarButton onClick={() => setPending(null)}>Cancel</ToolbarButton>
            <ToolbarButton primary disabled={state.submitting} onClick={start}>
              {state.submitting ? 'Verifying…' : 'Start Break'}
            </ToolbarButton>
          </>
        }
      >
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Account Password to Confirm
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Enter your login password..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </Modal>

      {/* End Break Password Modal */}
      <Modal
        open={endBreakModalOpen}
        title="Verify Break Out"
        subtitle="Confirm your password to end break and return to work"
        onClose={() => setEndBreakModalOpen(false)}
        size="sm"
        footer={
          <>
            <ToolbarButton onClick={() => setEndBreakModalOpen(false)}>Cancel</ToolbarButton>
            <ToolbarButton primary disabled={state.submitting || !password} onClick={confirmEndBreak}>
              {state.submitting ? 'Verifying…' : 'Verify & End Break'}
            </ToolbarButton>
          </>
        }
      >
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Account Password to Confirm
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Enter your login password..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </Modal>

      {/* Custom Break Request Modal */}
      <Modal
        open={requestOpen}
        title="Request Custom Break"
        subtitle="Administrator approval is required before this break can be taken."
        onClose={() => setRequestOpen(false)}
        size="sm"
        footer={
          <>
            <ToolbarButton onClick={() => setRequestOpen(false)}>Cancel</ToolbarButton>
            <ToolbarButton primary disabled={state.submitting} onClick={submitRequest}>
              {state.submitting ? 'Submitting…' : 'Submit Request'}
            </ToolbarButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Reason</label>
            <textarea
              value={request.reason}
              onChange={(event) => setRequest({ ...request, reason: event.target.value })}
              placeholder="Provide specific reason for custom break (e.g. Doctor appointment, urgent call, personal wellness)..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Requested Duration (Minutes)
            </label>
            <input
              type="number"
              min="5"
              max="120"
              value={request.requestedDuration}
              onChange={(event) =>
                setRequest({ ...request, requestedDuration: Number(event.target.value) })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Account Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Confirm with your password..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TakeBreak;