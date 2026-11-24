import { useEffect, useState } from 'react';
import {
  Coffee,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Minimize2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { feedback } from '../lib/feedback';

const BreakOverlay = () => {
  const { activeBreak, timeLeft, elapsedExceeded, endBreakTimer } = useAuth();
  const [minimized, setMinimized] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!activeBreak) {
      setMinimized(false);
      setShowVerify(false);
      setPassword('');
      setError('');
    }
  }, [activeBreak]);

  if (!activeBreak || minimized) return null;

  const closeVerification = () => {
    setShowVerify(false);
    setPassword('');
    setError('');
  };

  // Password-verified return to work
  const handleVerifyAndEnd = async (event) => {
    event?.preventDefault();
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      await api.post('/api/auth/verify', { password });
      await api.put(`/api/breaks/end/${activeBreak._id}`, { password });
      endBreakTimer();
      closeVerification();
      window.dispatchEvent(new CustomEvent('teamhub:breaks-updated'));
      feedback.success('Identity verified. Welcome back to work!');
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'Verification failed. Check your password and try again.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const exceeded = timeLeft <= 0;
  const allottedSeconds = Math.max(1, Number(activeBreak.allottedDuration || 15)) * 60;
  const progress = timeLeft > 0
    ? Math.max(0, Math.min(100, (timeLeft / allottedSeconds) * 100))
    : 100;

  const breakName = String(activeBreak.breakType || 'Break').split(' [')[0];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl transition-all duration-300">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-[140px] opacity-25 transition-colors duration-500 ${
            exceeded ? 'bg-rose-600' : 'bg-amber-500'
          }`}
        />
      </div>

      {/* Top Header bar */}
      <div className="absolute top-4 sm:top-6 inset-x-4 sm:inset-x-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
            T
          </div>
          <span className="text-sm font-bold text-white tracking-tight hidden xs:inline">
            TeamHub <span className="text-blue-400 font-medium">ERP</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg backdrop-blur-md"
          title="Minimize overlay to top navbar"
        >
          <Minimize2 size={14} className="text-slate-400" />
          <span>Minimize to navbar</span>
        </button>
      </div>

      {/* Main Glassmorphic Card */}
      <section
        className={`relative w-full max-w-lg bg-slate-900/95 border ${
          exceeded
            ? 'border-rose-500/40 shadow-rose-950/40 ring-1 ring-rose-500/20'
            : 'border-slate-800 shadow-slate-950/60 ring-1 ring-slate-700/30'
        } rounded-3xl p-7 sm:p-10 shadow-2xl text-center backdrop-blur-2xl transition-all`}
      >
        {/* Top Accent Gradient Line */}
        <div
          className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${
            exceeded
              ? 'from-rose-500 via-red-500 to-rose-600'
              : 'from-amber-400 via-amber-500 to-amber-600'
          }`}
        />

        {/* Status Pill Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5 border select-none ${
            exceeded
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full animate-ping ${
              exceeded ? 'bg-rose-500' : 'bg-amber-400'
            }`}
          />
          <span className="capitalize">{exceeded ? 'Break Time Exceeded' : 'Break in Progress'}</span>
        </div>

        {/* Coffee Icon Glow Container */}
        <div
          className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3 border shadow-inner ${
            exceeded
              ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
              : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
          }`}
        >
          <Coffee size={32} />
        </div>

        {/* Break Type Name */}
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
          {breakName}
        </p>

        {/* Big Monospace Timer Display (Fixed font, clear spacing & colon) */}
        <div className="my-3 flex items-center justify-center font-mono">
          <span
            className={`text-6xl sm:text-7xl font-extrabold tracking-normal tabular-nums drop-shadow-md select-none ${
              exceeded ? 'text-rose-400' : 'text-white'
            }`}
          >
            {exceeded ? `-${formatTime(elapsedExceeded)}` : formatTime(timeLeft)}
          </span>
        </div>

        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-400">
          {exceeded ? 'Overtime duration' : 'Time remaining'}
        </p>

        {/* Visual Progress Bar */}
        <div className="w-full h-2 bg-slate-800 rounded-full my-5 overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              exceeded
                ? 'bg-gradient-to-r from-rose-500 to-red-600'
                : 'bg-gradient-to-r from-amber-400 to-amber-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Explanatory Description */}
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
          {exceeded
            ? 'Your scheduled break duration has ended. Please return to work or resume your shift.'
            : 'Take a moment to relax and recharge. You can minimize to browse TeamHub or return to work anytime.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setShowVerify(true)}
            className={`w-full sm:w-auto px-7 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-95 ${
              exceeded
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
            }`}
          >
            <LockKeyhole size={15} />
            <span>Return to Work (Verify Password)</span>
          </button>
        </div>
      </section>

      {/* Identity Verification Modal (Screenshot 2 fix: high contrast, visible title, clean layout) */}
      {showVerify && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={closeVerification}
            aria-hidden="true"
          />
          <section className="relative w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-10 text-left">
            <header className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Identity Verification
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirm your password before resuming the shift.
                </p>
              </div>
              <button
                type="button"
                onClick={closeVerification}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <form className="mt-5 space-y-4" onSubmit={handleVerifyAndEnd}>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center shrink-0">
                  <LockKeyhole size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Security Verification
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Enter your account password to verify identity
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div
                  className={`flex items-center bg-white dark:bg-slate-900 border ${
                    error
                      ? 'border-rose-400 ring-2 ring-rose-400/20'
                      : 'border-slate-300 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
                  } rounded-xl px-3 py-2 transition-all`}
                >
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your account password to resume shift"
                    className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                    autoFocus
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                    <ShieldCheck size={13} />
                    {error}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={closeVerification}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying || !password}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {verifying ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  Verify & Resume
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default BreakOverlay;
