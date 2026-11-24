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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [attendanceStatus, setAttendanceStatus] = useState({
    loading: true,
    hasRecord: false,
    isPunchedIn: false,
    isShiftCompleted: false,
    isEarlyCheckout: false,
    totalHours: 0,
    status: null,
    loginTime: null,
    logoutTime: null,
    isLateCheckIn: false,
    lateReason: null,
    isLatePending: false,
    pendingLateMinutes: 0,
    projectedLateCount: 0,
    scheduledStartTime: null,
    shiftName: 'Standard Shift',
    graceMinutes: 15,
  });
  const timerRef = useRef(null);
  const wakeLockRef = useRef(null);

  const fetchAttendanceStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/api/attendance/shift-status');
      const isShiftCompleted = Boolean(data?.isShiftCompleted);
      const totalHours = typeof data?.totalHours === 'number'
        ? data.totalHours
        : (data?.loginTime && data?.logoutTime
            ? Math.max(0, (new Date(data.logoutTime).getTime() - new Date(data.loginTime).getTime()) / 3600000)
            : 0);
      const isEarlyCheckout = Boolean(
        data?.isEarlyCheckout ?? (isShiftCompleted && (totalHours < 7 || data?.status === 'Half Day'))
      );
      setAttendanceStatus({
        loading: false,
        hasRecord: Boolean(data?.hasRecord),
        isPunchedIn: Boolean(data?.isPunchedIn),
        isShiftCompleted,
        isEarlyCheckout,
        totalHours,
        grossHours: data?.grossHours ?? totalHours,
        status: data?.status || null,
        isLateCheckIn: Boolean(data?.isLateCheckIn),
        lateReason: data?.lateReason || null,
        isLatePenalty: Boolean(data?.isLatePenalty),
        penaltyDeductionHours: data?.penaltyDeductionHours || 0,
        lateCountInMonth: data?.lateCountInMonth || 0,
        loginTime: data?.loginTime || null,
        logoutTime: data?.logoutTime || null,
        isLatePending: Boolean(data?.isLatePending),
        pendingLateMinutes: Number(data?.pendingLateMinutes || 0),
        projectedLateCount: Number(data?.projectedLateCount || 0),
        scheduledStartTime: data?.scheduledStartTime || null,
        shiftName: data?.shiftName || 'Standard Shift',
        graceMinutes: Number(data?.graceMinutes || 15),
      });
      return data;
    } catch {
      setAttendanceStatus((prev) => ({ ...prev, loading: false }));
      return null;
    }
  }, []);

  const punch = useCallback(async (action, extraData = {}) => {
    const { data } = await api.post('/api/attendance/punch', { action, ...extraData });
    if (data?.record) {
      const rec = data.record;
      const isShiftCompleted = Boolean(rec.loginTime && rec.logoutTime);
      const isPunchedIn = Boolean(rec.loginTime && !rec.logoutTime);
      setAttendanceStatus((prev) => ({
        ...prev,
        hasRecord: true,
        isPunchedIn,
        isShiftCompleted,
        isLatePending: !rec.loginTime && !isShiftCompleted && prev.isLatePending,
        loginTime: rec.loginTime || null,
        logoutTime: rec.logoutTime || null,
        status: rec.status || prev.status,
        isLateCheckIn: Boolean(rec.isLateCheckIn),
        lateReason: rec.lateReason || null,
        isLatePenalty: Boolean(rec.isLatePenalty),
        penaltyDeductionHours: rec.penaltyDeductionHours || 0,
        lateCountInMonth: rec.lateCountInMonth || 0,
      }));
    }
    await fetchAttendanceStatus();
    return data;
  }, [fetchAttendanceStatus]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const updateBreakTimer = useCallback((breakLog) => {
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(breakLog.startTime).getTime()) / 1000));
    const allottedSeconds = Math.max(1, Number(breakLog.allottedDuration || 15)) * 60;
    setElapsedSeconds(elapsed);
    setTimeLeft(Math.max(0, allottedSeconds - elapsed));
    setElapsedExceeded(Math.max(0, elapsed - allottedSeconds));
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
    setElapsedSeconds(0);
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
        if (session && mounted) {
          await Promise.allSettled([
            hydrateActiveBreak(),
            fetchAttendanceStatus(),
          ]);
        }
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
      setAttendanceStatus({
        loading: false,
        hasRecord: false,
        isPunchedIn: false,
        isShiftCompleted: false,
        isEarlyCheckout: false,
        totalHours: 0,
        status: null,
        loginTime: null,
        logoutTime: null,
        isLateCheckIn: false,
        lateReason: null,
        isLatePending: false,
        pendingLateMinutes: 0,
        projectedLateCount: 0,
        scheduledStartTime: null,
        shiftName: 'Standard Shift',
        graceMinutes: 15,
      });
    };
    window.addEventListener('teamhub:session-expired', handleSessionExpired);
    return () => {
      mounted = false;
      stopTimer();
      window.removeEventListener('teamhub:session-expired', handleSessionExpired);
    };
  }, [endBreakTimer, fetchAttendanceStatus, hydrateActiveBreak, refreshUser, stopTimer]);

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
      await Promise.allSettled([
        hydrateActiveBreak(),
        fetchAttendanceStatus(),
      ]);
      return { success: true };
    } catch (error) {
      clearSession();
      setUser(null);
      return { success: false, error: getApiError(error, 'Unable to sign in') };
    }
  }, [fetchAttendanceStatus, hydrateActiveBreak]);

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
      setAttendanceStatus({
        loading: false,
        hasRecord: false,
        isPunchedIn: false,
        isShiftCompleted: false,
        isEarlyCheckout: false,
        totalHours: 0,
        status: null,
        loginTime: null,
        logoutTime: null,
        isLateCheckIn: false,
        lateReason: null,
        isLatePending: false,
        pendingLateMinutes: 0,
        projectedLateCount: 0,
        scheduledStartTime: null,
        shiftName: 'Standard Shift',
        graceMinutes: 15,
      });
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
    elapsedSeconds,
    startBreakTimer,
    endBreakTimer,
    hydrateActiveBreak,
    attendanceStatus,
    fetchAttendanceStatus,
    punch,
  }), [
    user,
    login,
    logout,
    loading,
    refreshUser,
    activeBreak,
    timeLeft,
    elapsedExceeded,
    elapsedSeconds,
    startBreakTimer,
    endBreakTimer,
    hydrateActiveBreak,
    attendanceStatus,
    fetchAttendanceStatus,
    punch,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
