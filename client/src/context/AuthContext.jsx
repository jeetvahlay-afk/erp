import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { asArray, clearSession, getApiError, storeSession } from '../lib/api';
import { getLogicalDateString } from '../utils/date';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeBreak, setActiveBreak] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsedExceeded, setElapsedExceeded] = useState(0);
  const timerRef = useRef(null);
  const wakeLockRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const updateBreakTimer = useCallback((breakLog) => {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(breakLog.startTime).getTime()) / 1000));
    const allottedSeconds = Math.max(1, Number(breakLog.allottedDuration || 15)) * 60;
    setTimeLeft(Math.max(0, allottedSeconds - elapsedSeconds));
    setElapsedExceeded(Math.max(0, elapsedSeconds - allottedSeconds));
  }, []);

  const startBreakTimer = useCallback((breakLog) => {
    stopTimer();
    setActiveBreak(breakLog);
    updateBreakTimer(breakLog);
    timerRef.current = window.setInterval(() => updateBreakTimer(breakLog), 1000);
  }, [stopTimer, updateBreakTimer]);

  const endBreakTimer = useCallback(() => {
    stopTimer();
    setActiveBreak(null);
    setTimeLeft(0);
    setElapsedExceeded(0);
  }, [stopTimer]);

  const hydrateActiveBreak = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/breaks/my-breaks?date=${getLogicalDateString()}`);
      const ongoing = asArray(data).find((item) => item.status === 'Ongoing');
      if (ongoing) startBreakTimer(ongoing);
      else endBreakTimer();
    } catch {
      endBreakTimer();
    }
  }, [endBreakTimer, startBreakTimer]);

  const refreshUser = useCallback(async () => {
    const remembered = Boolean(localStorage.getItem('teamhub.session'));
    const { data } = await api.get('/api/auth/me');
    const freshSession = { ...data, token: 'cookie-session' };
    storeSession(freshSession, remembered);
    setUser(freshSession);
    return freshSession;
  }, []);

  useEffect(() => {
    let mounted = true;
    const restoreSession = async () => {
      try {
        const session = await refreshUser();
        if (session && mounted) await hydrateActiveBreak();
      } catch {
        clearSession();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    restoreSession();

    const handleSessionExpired = () => {
      clearSession();
      setUser(null);
      endBreakTimer();
    };
    window.addEventListener('teamhub:session-expired', handleSessionExpired);
    return () => {
      mounted = false;
      stopTimer();
      window.removeEventListener('teamhub:session-expired', handleSessionExpired);
    };
  }, [endBreakTimer, hydrateActiveBreak, refreshUser, stopTimer]);

  useEffect(() => {
    if (!activeBreak || !('wakeLock' in navigator)) return undefined;
    let cancelled = false;

    const requestWakeLock = async () => {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        wakeLockRef.current = null;
      }
    };
    const handleVisibility = () => {
      if (!cancelled && document.visibilityState === 'visible') requestWakeLock();
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [activeBreak]);

  const login = useCallback(async (usernameOrEmail, password, remember = false) => {
    try {
      const { data } = await api.post('/api/auth/login', {
        username: usernameOrEmail,
        email: usernameOrEmail,
        password,
        remember,
      });
      const session = { ...data, token: 'cookie-session' };
      storeSession(session, remember);
      setUser(session);
      try {
        await api.post('/api/attendance/punch', { action: 'in' });
      } catch {
        // If shift already completed for today, allow session to continue without re-punching
      }
      await hydrateActiveBreak();
      return { success: true };
    } catch (error) {
      clearSession();
      setUser(null);
      return { success: false, error: getApiError(error, 'Unable to sign in') };
    }
  }, [hydrateActiveBreak]);

  const logout = useCallback(async (isDayComplete = false) => {
    try {
      if (isDayComplete) await api.post('/api/attendance/punch', { action: 'out' });
      await api.post('/api/auth/logout');
    } catch {
      // Local session removal must still complete if the server is unavailable.
    } finally {
      clearSession();
      setUser(null);
      endBreakTimer();
    }
  }, [endBreakTimer]);

  const value = useMemo(() => ({
    user,
    login,
    logout,
    loading,
    refreshUser,
    activeBreak,
    timeLeft,
    elapsedExceeded,
    startBreakTimer,
    endBreakTimer,
  }), [
    user,
    login,
    logout,
    loading,
    refreshUser,
    activeBreak,
    timeLeft,
    elapsedExceeded,
    startBreakTimer,
    endBreakTimer,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
