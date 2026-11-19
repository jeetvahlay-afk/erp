import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Clock, LogOut, ShieldAlert } from 'lucide-react';
import api from '../lib/api';
import { feedback } from '../lib/feedback';
import { useAuth } from '../context/AuthContext';

const formatSeconds = (totalSeconds) => {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.floor(Math.max(0, totalSeconds) % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatTimeOnly = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const ShiftOvertimeModal = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [extending, setExtending] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const timerRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/api/attendance/shift-status');
      setStatus(data);
      if (data?.shouldPrompt && typeof data.secondsRemaining === 'number') {
        setSecondsRemaining(data.secondsRemaining);
      }
    } catch {
      // ignore background poll error
    }
  }, [user]);

  // Initial and periodic polling
  useEffect(() => {
    if (!user) return undefined;
    fetchStatus();
    const interval = window.setInterval(fetchStatus, status?.shouldPrompt ? 10000 : 30000);
    return () => window.clearInterval(interval);
  }, [user, fetchStatus, status?.shouldPrompt]);

  // Countdown timer when prompt is active
  useEffect(() => {
    if (!status?.shouldPrompt) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return undefined;
    }

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // 10 minutes expired without response - trigger auto checkout
          handleAutoCheckout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [status?.shouldPrompt]);

  const handleAutoCheckout = async () => {
    try {
      await api.post('/api/attendance/punch', { action: 'out' });
      feedback.info('Your shift was automatically ended because no response was received within 10 minutes.');
      setStatus(null);
      fetchStatus();
    } catch {
      // error handled
    }
  };

  const handleExtend = async () => {
    setExtending(true);
    try {
      const { data } = await api.post('/api/attendance/extend-shift');
      feedback.success(data?.message || 'Shift extended by 1 hour.');
      setStatus(null);
      fetchStatus();
    } catch (err) {
      feedback.error(err.response?.data?.message || 'Unable to extend shift.');
    } finally {
      setExtending(false);
    }
  };

  const handleManualPunchOut = async () => {
    setCheckingOut(true);
    try {
      await api.post('/api/attendance/punch', { action: 'out' });
      feedback.success('Shift completed. Punched out successfully.');
      setStatus(null);
      fetchStatus();
    } catch (err) {
      feedback.error(err.response?.data?.message || 'Unable to punch out.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (!status?.shouldPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-amber-300 dark:border-amber-600/40 p-6 overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-rose-500 to-amber-500" />

        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
            <AlertTriangle size={22} className="animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Shift Ended — Are You Still Working?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Your scheduled shift ({status.shiftName}) ended at{' '}
              <strong className="text-slate-800 dark:text-slate-200">{formatTimeOnly(status.scheduledEndTime)}</strong>.
              You are now 15 minutes past your scheduled shift end.
            </p>
          </div>
        </div>

        {/* 10-Minute Auto-Checkout Urgency Box */}
        <div className="mt-4 p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Clock size={14} className="text-amber-600" />
              Auto check-out in:
            </span>
            <span className="text-sm font-mono font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
              {formatSeconds(secondsRemaining)}
            </span>
          </div>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mt-1">
            If no action is taken within 10 minutes, the system will automatically check you out to prevent unauthorized hours.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={extending || checkingOut}
            onClick={handleExtend}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Clock size={14} />
            <span>{extending ? 'Extending…' : 'Yes, Still Working (+1h)'}</span>
          </button>

          <button
            type="button"
            disabled={extending || checkingOut}
            onClick={handleManualPunchOut}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <LogOut size={14} />
            <span>{checkingOut ? 'Checking out…' : 'Punch Out Now'}</span>
          </button>
        </div>

        <div className="mt-3.5 text-center">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 inline-flex items-center gap-1">
            <ShieldAlert size={11} /> Once checked out, re-entry is blocked until your next scheduled shift.
          </span>
        </div>
      </div>
    </div>
  );
};

export default ShiftOvertimeModal;
