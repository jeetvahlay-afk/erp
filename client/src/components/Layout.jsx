import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  Cake,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCheck,
  CheckSquare,
  ChevronDown,
  CircleUserRound,
  Clock,
  Coffee,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck2,
  FileSignature,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Palette,
  Receipt,
  Route,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UserCog,
  UserPlus,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { feedback } from '../lib/feedback';
import { getLogicalDateString } from '../utils/date';
import {
  ADMIN_ROLES,
  HR_ROLES,
  RECRUITMENT_ROLES,
  hasPermission,
  hasRole,
} from '../lib/access';
import BreakOverlay from './BreakOverlay';
import ShiftOvertimeModal from './ShiftOvertimeModal';
import BirthdayCelebrationOverlay from './BirthdayCelebrationOverlay';
import { useTheme } from '../context/ThemeContext';
import { canAccessRoute } from '../lib/routeAccess';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - past) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
};

const calculateBreakDuration = (item) => {
  if (item.calculatedLimit) return item.calculatedLimit;
  if (item.allottedDuration) return item.allottedDuration;
  if (!item.fromTime || !item.toTime) return Number(item.limit || 15);
  const [fh, fm] = item.fromTime.split(':').map(Number);
  const [th, tm] = item.toTime.split(':').map(Number);
  let diff = (th * 60 + tm) - (fh * 60 + fm);
  if (diff < 0) diff += 1440;
  return diff || 15;
};

const formatBreakTimer = (seconds, exceededSeconds) => {
  if (seconds > 0) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(exceededSeconds / 60);
  const s = exceededSeconds % 60;
  return `+${m}:${String(s).padStart(2, '0')}`;
};

const formatLoginTime = (timeStr) => {
  if (!timeStr) return '';
  const d = new Date(timeStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const Layout = () => {
  const {
    user,
    logout,
    attendanceStatus,
    punch,
    activeBreak,
    timeLeft,
    elapsedExceeded,
    startBreakTimer,
    endBreakTimer,
  } = useAuth();
  const { appearance, updateAppearance } = useTheme();
  const isDark = appearance?.mode === 'dark' || (appearance?.mode === 'system' && (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches));
  const navigate = useNavigate();
  const location = useLocation();
  const commandInputRef = useRef(null);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);
  const shiftMenuRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [showBirthdayCelebration, setShowBirthdayCelebration] = useState(false);
  const [birthdayCelebrant, setBirthdayCelebrant] = useState(null);
  const [selectedBirthdayPerson, setSelectedBirthdayPerson] = useState(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [dashboardsOpen, setDashboardsOpen] = useState(true);
  const [recruitmentOpen, setRecruitmentOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const isRecruitmentActive = useMemo(() => {
    return (
      location.pathname === '/manage-interviews' ||
      location.pathname.startsWith('/manage-agreements')
    );
  }, [location.pathname]);

  useEffect(() => {
    if (isRecruitmentActive) {
      setRecruitmentOpen(true);
    }
  }, [isRecruitmentActive]);

  const [shiftMenuOpen, setShiftMenuOpen] = useState(false);
  const [dailyBreaks, setDailyBreaks] = useState([]);
  const [loadingBreaks, setLoadingBreaks] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const [breakActionLoading, setBreakActionLoading] = useState(false);

  const [shiftNow, setShiftNow] = useState(new Date());

  useEffect(() => {
    if (!attendanceStatus?.isPunchedIn) return undefined;
    const interval = window.setInterval(() => setShiftNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [attendanceStatus?.isPunchedIn]);

  const elapsedShiftTime = useMemo(() => {
    if (!attendanceStatus?.loginTime) return '00:00:00';
    const start = new Date(attendanceStatus.loginTime).getTime();
    if (Number.isNaN(start)) return '00:00:00';
    const end = attendanceStatus.logoutTime ? new Date(attendanceStatus.logoutTime).getTime() : shiftNow.getTime();
    const diffSeconds = Math.max(0, (end - start) / 1000);
    const total = Math.floor(diffSeconds);
    const hrs = String(Math.floor(total / 3600)).padStart(2, '0');
    const mins = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const secs = String(total % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }, [attendanceStatus?.loginTime, attendanceStatus?.logoutTime, shiftNow]);

  const [pendingBreak, setPendingBreak] = useState(null);
  const [breakPassword, setBreakPassword] = useState('');
  const [breakPasswordError, setBreakPasswordError] = useState('');
  const [showBreakPassword, setShowBreakPassword] = useState(false);
  const [breakPasswordModalOpen, setBreakPasswordModalOpen] = useState(false);

  const [breakOutPassword, setBreakOutPassword] = useState('');
  const [breakOutPasswordError, setBreakOutPasswordError] = useState('');
  const [showBreakOutPassword, setShowBreakOutPassword] = useState(false);
  const [breakOutPasswordModalOpen, setBreakOutPasswordModalOpen] = useState(false);

  const isAdmin = hasRole(user, ADMIN_ROLES);
  const canHR = hasRole(user, HR_ROLES) || hasPermission(user, ['employees.read', 'attendance.read', 'leaves.read']);
  const canEmployees = isAdmin || hasPermission(user, ['employees.read', 'employees.create', 'employees.write']);
  const canDepartments = isAdmin || hasPermission(user, ['departments.read', 'departments.create', 'departments.write']);
  const canAttendance = hasRole(user, HR_ROLES) || hasPermission(user, ['attendance.read', 'attendance.write']);
  const canLeave = hasRole(user, HR_ROLES) || hasPermission(user, ['leaves.read', 'leaves.write']);
  const canRecruit = hasRole(user, RECRUITMENT_ROLES) || hasPermission(user, ['recruitment.read', 'recruitment.create', 'recruitment.write']);
  const canPayroll = isAdmin || hasPermission(user, ['payroll.read', 'payroll.write']);
  const canRoles = isAdmin || hasPermission(user, ['roles.read', 'roles.create', 'roles.write']);
  const canSettings = isAdmin || hasPermission(user, ['settings.read', 'settings.write']);
  const canAudit = isAdmin || hasPermission(user, ['audit.read']);
  const canBreaks = canAttendance || canSettings || isAdmin;

  const showRoute = useCallback(
    (path, functionalAccess = true) => functionalAccess && canAccessRoute(user, path),
    [user]
  );

  const hasDashboards =
    showRoute('/dashboard/admin', isAdmin) ||
    showRoute('/dashboard/employee') ||
    showRoute('/dashboard/hr', canHR);

  const hasHRRoutes =
    showRoute('/manage-employee', canEmployees) ||
    showRoute('/manage-departments', canDepartments) ||
    showRoute('/manage-attendance', canAttendance) ||
    showRoute('/manage-breaks', canBreaks) ||
    showRoute('/manage-leaves', canLeave) ||
    showRoute('/manage-interviews', canRecruit) ||
    showRoute('/profile-requests', canEmployees) ||
    showRoute('/work-reports', canEmployees) ||
    showRoute('/payrolls', canPayroll) ||
    showRoute('/salary-config', canPayroll);

  const hasSelfService =
    showRoute('/attendance') ||
    showRoute('/leaves') ||
    showRoute('/take-break') ||
    showRoute('/my-payroll') ||
    showRoute('/my-documents') ||
    showRoute('/my-work-report') ||
    showRoute('/tasks');

  const hasCompany =
    showRoute('/announcements') ||
    showRoute('/birthdays') ||
    showRoute('/events');

  const hasSystemRoutes =
    showRoute('/manage-roles', canRoles) ||
    showRoute('/manage-routes', canSettings) ||
    showRoute('/configurations', canSettings) ||
    showRoute('/manage-shift', canSettings) ||
    showRoute('/audit-logs', canAudit) ||
    (isAdmin && showRoute('/settings/appearance'));

  const knownNotificationIdsRef = useRef(new Set());
  const isInitialNotificationFetchRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications?limit=15');
      const items = res.data?.items || [];
      setNotifications(items);
      setUnreadCount(Number(res.data?.unreadCount || 0));

      if (isInitialNotificationFetchRef.current) {
        items.forEach((item) => item._id && knownNotificationIdsRef.current.add(item._id));
        isInitialNotificationFetchRef.current = false;
      } else {
        const newUnread = items.filter((item) => item._id && !item.readAt && !knownNotificationIdsRef.current.has(item._id));
        newUnread.forEach((item) => {
          knownNotificationIdsRef.current.add(item._id);
          feedback.notification({
            title: item.title || 'New Notification',
            message: item.message,
            tone: item.type === 'error' ? 'error' : item.type === 'warning' ? 'warning' : 'info',
          }, () => {
            if (item.actionUrl) navigate(item.actionUrl);
            else setNotificationsOpen(true);
          });
        });
        items.forEach((item) => item._id && knownNotificationIdsRef.current.add(item._id));
      }
    } catch {
      // silently ignore background poll
    }
  }, [navigate]);

  const fetchBirthdayCelebrants = useCallback(async () => {
    try {
      const res = await api.get('/api/workspace/birthdays');
      const items = Array.isArray(res.data) ? res.data : [];
      if (!items.length) {
        setBirthdayCelebrant(null);
        return;
      }
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentDate = now.getDate();

      // Find person whose birthday is today! (Check both local and UTC date to prevent timezone shifts)
      const todayCelebrant = items.find((item) => {
        if (!item.dob && !item.nextBirthday) return false;
        const d = new Date(item.nextBirthday || item.dob);
        if (Number.isNaN(d.getTime())) return false;
        const isMatchLocal = d.getMonth() === currentMonth && d.getDate() === currentDate;
        const isMatchUTC = d.getUTCMonth() === currentMonth && d.getUTCDate() === currentDate;
        return isMatchLocal || isMatchUTC;
      });

      // ONLY display the birthday celebration pill when someone actually has a birthday TODAY
      setBirthdayCelebrant(todayCelebrant || null);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    if (!user?._id) return undefined;
    fetchBirthdayCelebrants();
    const interval = window.setInterval(fetchBirthdayCelebrants, 60000);
    return () => window.clearInterval(interval);
  }, [fetchBirthdayCelebrants, user?._id]);

  useEffect(() => {
    if (!user?._id) return undefined;
    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 25000);
    return () => window.clearInterval(interval);
  }, [fetchNotifications, user?._id]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnreadCount(0);
      feedback.success('All notifications marked as read');
    } catch {
      feedback.error('Unable to mark notifications as read');
    }
  };

  const handleNotificationClick = async (item) => {
    if (!item.readAt) {
      try {
        await api.patch(`/api/notifications/${item._id}/read`);
        setNotifications((prev) => prev.map((n) => (n._id === item._id ? { ...n, readAt: new Date().toISOString() } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore
      }
    }
    setNotificationsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  useEffect(() => {
    const handleKeyboard = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
        window.setTimeout(() => commandInputRef.current?.focus(), 0);
      }
      if (event.key === 'Escape') {
        setCommandOpen(false);
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (shiftMenuRef.current && !shiftMenuRef.current.contains(event.target)) {
        setShiftMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
    setCommandOpen(false);
    setNotificationsOpen(false);
    setShiftMenuOpen(false);
  }, [location.pathname]);

  const fetchBreaks = useCallback(async () => {
    setLoadingBreaks(true);
    try {
      const calDate = new Date().toLocaleDateString('en-CA');
      const logicalDate = getLogicalDateString();
      let res = await api.get(`/api/daily-breaks?date=${calDate}`);
      if (!res.data?.breaks?.length && calDate !== logicalDate) {
        try {
          const altRes = await api.get(`/api/daily-breaks?date=${logicalDate}`);
          if (altRes.data?.breaks?.length) res = altRes;
        } catch {
          // ignore
        }
      }
      setDailyBreaks(asArray(res.data?.breaks));
    } catch {
      setDailyBreaks([]);
    } finally {
      setLoadingBreaks(false);
    }
  }, []);

  useEffect(() => {
    fetchBreaks();
    const handleBreaksUpdated = () => fetchBreaks();
    window.addEventListener('teamhub:breaks-updated', handleBreaksUpdated);
    return () => window.removeEventListener('teamhub:breaks-updated', handleBreaksUpdated);
  }, [fetchBreaks]);

  const [lateReasonText, setLateReasonText] = useState('');
  const [submittingLateReason, setSubmittingLateReason] = useState(false);
  const [lateReasonError, setLateReasonError] = useState('');

  const showLateModal = Boolean(
    user?._id &&
    !attendanceStatus.loading &&
    !attendanceStatus.isPunchedIn &&
    !attendanceStatus.isShiftCompleted &&
    attendanceStatus.isLatePending
  );

  const autoCheckedInRef = useRef(false);
  useEffect(() => {
    if (!user?._id || attendanceStatus.loading) return;
    if (attendanceStatus.isPunchedIn || attendanceStatus.isShiftCompleted) return;
    if (attendanceStatus.isLatePending) return; // Do NOT auto-check-in if late!

    if (!autoCheckedInRef.current) {
      autoCheckedInRef.current = true;
      punch('in').then(() => {
        feedback.success(`Welcome back, ${user.name || 'there'}! Automatically checked in on time.`);
      }).catch((err) => {
        console.warn('Auto check-in not performed:', err);
      });
    }
  }, [
    user?._id,
    user?.name,
    attendanceStatus.loading,
    attendanceStatus.isPunchedIn,
    attendanceStatus.isShiftCompleted,
    attendanceStatus.isLatePending,
    punch,
  ]);

  const handleSelectReasonPill = (pill) => {
    setLateReasonText((prev) => {
      if (!prev.trim()) return pill;
      if (prev.includes(pill)) return prev;
      return `${prev}, ${pill}`;
    });
    setLateReasonError('');
  };

  const handleSubmitLateReason = async () => {
    if (lateReasonText.trim().length < 10) {
      setLateReasonError('Please provide a proper explanation with at least 10 characters.');
      return;
    }
    setSubmittingLateReason(true);
    setLateReasonError('');
    try {
      await punch('in', { lateReason: lateReasonText.trim() });
      feedback.success('Reason recorded and checked in successfully. Have a good shift!');
      setLateReasonText('');
    } catch (error) {
      setLateReasonError(getApiError(error, 'Failed to submit late check-in reason'));
    } finally {
      setSubmittingLateReason(false);
    }
  };

  const handleCheckIn = async () => {
    if (attendanceStatus.isLatePending) {
      feedback.info('Shift started past scheduled time. Please submit your reason in the popup to check in.');
      return;
    }
    setPunchLoading(true);
    try {
      await punch('in');
      feedback.success('Checked in successfully. Have a productive day!');
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to check in'));
    } finally {
      setPunchLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (activeBreak) {
      feedback.warning('You are currently on a break. You must break out (end your break) before checking out.');
      return;
    }
    const confirmed = await feedback.confirm(
      'Are you sure you want to Check Out and complete your shift for today?',
      {
        title: 'Check Out Confirmation',
        confirmLabel: 'Check Out',
        tone: 'warning',
      }
    );
    if (!confirmed) return;
    setPunchLoading(true);
    try {
      await punch('out');
      window.dispatchEvent(new CustomEvent('teamhub:breaks-updated'));
      feedback.success('Checked out successfully. Shift completed!');
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to check out'));
    } finally {
      setPunchLoading(false);
    }
  };

  const handleSelectBreak = (breakItem) => {
    if (!attendanceStatus?.isPunchedIn) {
      feedback.warning('Please check in before taking a break.');
      return;
    }
    setPendingBreak(breakItem);
    setBreakPassword('');
    setBreakPasswordError('');
    setBreakPasswordModalOpen(true);
    setShiftMenuOpen(false);
  };

  const handleConfirmStartBreak = async (e) => {
    e?.preventDefault();
    if (!pendingBreak || !breakPassword) {
      setBreakPasswordError('Please enter your account password.');
      return;
    }
    setBreakActionLoading(true);
    setBreakPasswordError('');
    try {
      await api.post('/api/auth/verify', { password: breakPassword });
      const duration = calculateBreakDuration(pendingBreak);
      const breakType = pendingBreak.fromTime
        ? `${pendingBreak.breakType} [${pendingBreak.fromTime}-${pendingBreak.toTime}]`
        : pendingBreak.breakType;
      const { data: breakLog } = await api.post('/api/breaks/start', {
        breakType,
        allottedDuration: duration,
      });
      startBreakTimer(breakLog);
      setBreakPasswordModalOpen(false);
      setPendingBreak(null);
      setBreakPassword('');
      window.dispatchEvent(new CustomEvent('teamhub:breaks-updated'));
      feedback.success(`${pendingBreak.breakType} started (${duration} mins).`);
    } catch (error) {
      setBreakPasswordError(getApiError(error, 'Verification failed. Incorrect password.'));
    } finally {
      setBreakActionLoading(false);
    }
  };

  const handleOpenBreakOutModal = () => {
    if (!activeBreak?._id) return;
    setBreakOutPassword('');
    setBreakOutPasswordError('');
    setBreakOutPasswordModalOpen(true);
    setShiftMenuOpen(false);
  };

  const handleConfirmEndBreak = async (e) => {
    e?.preventDefault();
    if (!activeBreak?._id || !breakOutPassword) {
      setBreakOutPasswordError('Please enter your account password.');
      return;
    }
    setBreakActionLoading(true);
    setBreakOutPasswordError('');
    try {
      await api.post('/api/auth/verify', { password: breakOutPassword });
      await api.put(`/api/breaks/end/${activeBreak._id}`, { password: breakOutPassword });
      endBreakTimer();
      setBreakOutPasswordModalOpen(false);
      setBreakOutPassword('');
      window.dispatchEvent(new CustomEvent('teamhub:breaks-updated'));
      feedback.success('Break ended. Welcome back to work!');
    } catch (error) {
      setBreakOutPasswordError(getApiError(error, 'Verification failed. Incorrect password.'));
    } finally {
      setBreakActionLoading(false);
    }
  };

  const availableBreaks = useMemo(() => dailyBreaks, [dailyBreaks]);

  const handleLogout = async () => {
    const accepted = await feedback.confirm('End your current ERP session?', {
      title: 'Sign out',
      confirmLabel: 'Sign out',
      tone: 'danger',
    });
    if (!accepted) return;
    await logout(false);
    navigate('/login', { replace: true });
  };

  const initials = useMemo(() => {
    if (!user?.name) return 'SS';
    const parts = user.name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }, [user?.name]);

  const resolvedAvatarUrl = useMemo(() => {
    if (!user) return null;
    if (user.profileImage) {
      return /^(https?:|data:|blob:|\/)/.test(user.profileImage)
        ? user.profileImage
        : `/uploads/avatars/${user.profileImage}`;
    }
    return user.avatar || null;
  }, [user]);

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] dark:bg-[#0b0f17] overflow-hidden text-slate-800 dark:text-slate-100">
      {/* Scoped Sidebar CSS - Themed Colored Sidebar with High Legibility & Translucent Hover */}
      <style>{`
        .erp-sb-aside {
          width: var(--erp-sidebar-width, 248px) !important;
          background-color: var(--erp-sidebar-bg, #111827) !important;
          border-right: 1px solid var(--erp-sidebar-border, rgba(255, 255, 255, 0.08)) !important;
        }

        /* Sleek custom scrollbars for dark sidebar - prevents ugly white Windows rail */
        .erp-sb-aside nav,
        .erp-sb-aside .erp-sb-nav {
          scrollbar-width: thin !important;
          scrollbar-color: rgba(255, 255, 255, 0.16) transparent !important;
        }
        .erp-sb-aside nav::-webkit-scrollbar,
        .erp-sb-aside .erp-sb-nav::-webkit-scrollbar {
          width: 4px !important;
          background: transparent !important;
        }
        .erp-sb-aside nav::-webkit-scrollbar-track,
        .erp-sb-aside .erp-sb-nav::-webkit-scrollbar-track {
          background: transparent !important;
        }
        .erp-sb-aside nav::-webkit-scrollbar-thumb,
        .erp-sb-aside .erp-sb-nav::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18) !important;
          border-radius: 9999px !important;
        }
        .erp-sb-aside nav::-webkit-scrollbar-thumb:hover,
        .erp-sb-aside .erp-sb-nav::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.35) !important;
        }

        /* Subtle main workspace scrollbar */
        main::-webkit-scrollbar {
          width: 6px !important;
          height: 6px !important;
        }
        main::-webkit-scrollbar-track {
          background: transparent !important;
        }
        main::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3) !important;
          border-radius: 9999px !important;
        }
        main::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5) !important;
        }

        .erp-sb-section-title {
          color: #93c5fd !important;
          font-size: 10.5px !important;
          font-weight: 700 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
          padding: 0 10px !important;
          margin-top: 13px !important;
          margin-bottom: 4px !important;
          white-space: nowrap !important;
          opacity: 0.85 !important;
        }

        .erp-sb-link {
          color: #e2e8f0 !important;
          display: flex !important;
          align-items: center !important;
          gap: 9px !important;
          padding: 6.5px 10px !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          text-decoration: none !important;
          white-space: nowrap !important;
          background-color: transparent !important;
          transition: all 0.15s ease !important;
          cursor: pointer !important;
        }
        .erp-sb-link * {
          color: #e2e8f0 !important;
        }
        .erp-sb-link span {
          color: #e2e8f0 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .erp-sb-link svg {
          color: #94a3b8 !important;
          stroke: #94a3b8 !important;
          flex-shrink: 0 !important;
          transition: color 0.15s ease, stroke 0.15s ease !important;
        }
        .erp-sb-link:hover {
          color: #ffffff !important;
          background-color: rgba(255, 255, 255, 0.12) !important;
        }
        .erp-sb-link:hover * {
          color: #ffffff !important;
        }
        .erp-sb-link:hover span {
          color: #ffffff !important;
        }
        .erp-sb-link:hover svg {
          color: #ffffff !important;
          stroke: #ffffff !important;
        }
        .erp-sb-link.active {
          color: #ffffff !important;
          background-color: var(--erp-primary, #2563eb) !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 14px color-mix(in srgb, var(--erp-primary, #2563eb) 40%, transparent) !important;
        }
        .erp-sb-link.active * {
          color: #ffffff !important;
          font-weight: 600 !important;
        }
        .erp-sb-link.active span {
          color: #ffffff !important;
          font-weight: 600 !important;
        }
        .erp-sb-link.active svg {
          color: #ffffff !important;
          stroke: #ffffff !important;
        }
        .erp-sb-link.active:hover {
          background-color: var(--erp-primary, #2563eb) !important;
          filter: brightness(1.08) !important;
          color: #ffffff !important;
        }

        .erp-sb-dropdown-btn {
          color: #e2e8f0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          width: 100% !important;
          padding: 6.5px 10px !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          white-space: nowrap !important;
          background-color: transparent !important;
          background: transparent !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          transition: all 0.15s ease !important;
          cursor: pointer !important;
        }
        .erp-sb-dropdown-btn * {
          color: #e2e8f0 !important;
        }
        .erp-sb-dropdown-btn span {
          color: #e2e8f0 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .erp-sb-dropdown-btn svg {
          color: #94a3b8 !important;
          stroke: #94a3b8 !important;
          transition: color 0.15s ease, stroke 0.15s ease !important;
        }
        .erp-sb-dropdown-btn:hover,
        .erp-sb-dropdown-btn:focus,
        .erp-sb-dropdown-btn:focus-visible,
        .erp-sb-dropdown-btn:active {
          color: #ffffff !important;
          background-color: rgba(255, 255, 255, 0.12) !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .erp-sb-dropdown-btn:hover *,
        .erp-sb-dropdown-btn:focus *,
        .erp-sb-dropdown-btn:focus-visible *,
        .erp-sb-dropdown-btn:active * {
          color: #ffffff !important;
        }
        .erp-sb-dropdown-btn:hover span,
        .erp-sb-dropdown-btn:focus span,
        .erp-sb-dropdown-btn:focus-visible span,
        .erp-sb-dropdown-btn:active span {
          color: #ffffff !important;
        }
        .erp-sb-dropdown-btn:hover svg,
        .erp-sb-dropdown-btn:focus svg,
        .erp-sb-dropdown-btn:focus-visible svg,
        .erp-sb-dropdown-btn:active svg {
          color: #ffffff !important;
          stroke: #ffffff !important;
        }
      `}</style>

      <BreakOverlay />
      <ShiftOvertimeModal />
      <BirthdayCelebrationOverlay
        celebrant={selectedBirthdayPerson || birthdayCelebrant}
        user={user}
        isOpen={showBirthdayCelebration}
        onClose={() => {
          setShowBirthdayCelebration(false);
          setSelectedBirthdayPerson(null);
        }}
      />

      {/* Uncloseable Late Check-In Reason Modal */}
      {showLateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="late-checkin-title"
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {/* Backdrop with stopPropagation to make it strictly uncloseable */}
          <div className="fixed inset-0" aria-hidden="true" onClick={(e) => e.stopPropagation()} />
          <section
            className="relative w-full max-w-lg bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-amber-300/40 dark:border-amber-500/30 p-6 z-10 text-left overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock size={22} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 id="late-checkin-title" className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Late Check-In Required
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Your shift started past the scheduled time. Please submit an explanation to check in.
                </p>
              </div>
            </div>

            {/* Shift & Late Status Banner */}
            <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Shift Name:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{attendanceStatus.shiftName || 'Standard Shift'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Scheduled Start:</span>
                <span className="font-semibold">{formatLoginTime(attendanceStatus.scheduledStartTime) || '09:30 AM'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Delayed By:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {attendanceStatus.pendingLateMinutes || 0} minutes (grace: {attendanceStatus.graceMinutes || 15}m)
                </span>
              </div>
              {attendanceStatus.projectedLateCount > 0 && (
                <div className="pt-2 border-t border-amber-200/50 dark:border-amber-800/30 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  ⚠️ This will be your <strong>#{attendanceStatus.projectedLateCount}</strong> late check-in this month. Every 3 late check-ins results in a half-day deduction (4.5 hrs).
                </div>
              )}
            </div>

            {/* Quick Reason Pills */}
            <div className="mt-4">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
                Quick Select Common Reasons:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Traffic Congestion',
                  'Metro / Transit Delay',
                  'Vehicle Breakdown',
                  'Medical / Health Emergency',
                  'Severe Weather / Rain',
                  'Prior Approval from Manager',
                ].map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => handleSelectReasonPill(pill)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-slate-100 hover:bg-amber-100 hover:text-amber-800 dark:bg-slate-800 dark:hover:bg-amber-900/40 dark:text-slate-300 dark:hover:text-amber-200 border border-slate-200/70 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    + {pill}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="mt-3.5">
              <label htmlFor="late-reason-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Reason for Delay <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="late-reason-input"
                rows={3}
                value={lateReasonText}
                onChange={(e) => {
                  setLateReasonText(e.target.value);
                  if (lateReasonError) setLateReasonError('');
                }}
                placeholder="Explain specific reason for late check-in (e.g. Vehicle breakdown, transit delay, medical emergency)..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none transition-all"
              />
              <div className="flex items-center justify-between mt-1 text-[11px]">
                {lateReasonError ? (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">{lateReasonError}</span>
                ) : (
                  <span className="text-slate-400">Be specific and descriptive.</span>
                )}
                <span className={lateReasonText.trim().length >= 10 ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                  {lateReasonText.trim().length} / 10 min chars
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => logout()}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer underline"
              >
                Sign out instead
              </button>
              <button
                type="button"
                onClick={handleSubmitLateReason}
                disabled={lateReasonText.trim().length < 10 || submittingLateReason}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs hover:shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingLateReason ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Submitting Reason…</span>
                  </>
                ) : (
                  <>
                    <LogIn size={13} />
                    <span>Submit Reason & Check In</span>
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Verify Break Start Password Modal (Navbar Break) */}
      {breakPasswordModalOpen && pendingBreak && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => {
              setBreakPasswordModalOpen(false);
              setPendingBreak(null);
            }}
            aria-hidden="true"
          />
          <section className="relative w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-10 text-left">
            <header className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Verify Break Start
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {pendingBreak.breakType} · {calculateBreakDuration(pendingBreak)} minutes
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBreakPasswordModalOpen(false);
                  setPendingBreak(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <form className="mt-5 space-y-4" onSubmit={handleConfirmStartBreak}>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Coffee size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {pendingBreak.breakType}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Duration: {calculateBreakDuration(pendingBreak)} minutes allotted
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Account Password to Confirm
                </label>
                <div
                  className={`flex items-center bg-white dark:bg-slate-900 border ${
                    breakPasswordError
                      ? 'border-rose-400 ring-2 ring-rose-400/20'
                      : 'border-slate-300 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
                  } rounded-xl px-3 py-2 transition-all`}
                >
                  <input
                    type={showBreakPassword ? 'text' : 'password'}
                    value={breakPassword}
                    onChange={(e) => setBreakPassword(e.target.value)}
                    placeholder="Enter your account password to authorize break"
                    className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                    autoFocus
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBreakPassword((prev) => !prev)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    aria-label={showBreakPassword ? 'Hide password' : 'Show password'}
                  >
                    {showBreakPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {breakPasswordError && (
                  <p className="text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                    <ShieldCheck size={13} />
                    {breakPasswordError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={() => {
                    setBreakPasswordModalOpen(false);
                    setPendingBreak(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={breakActionLoading || !breakPassword}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {breakActionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  Verify & Start Break
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Verify Break Out Password Modal (Navbar Break Out) */}
      {breakOutPasswordModalOpen && activeBreak && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => {
              setBreakOutPasswordModalOpen(false);
            }}
            aria-hidden="true"
          />
          <section className="relative w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-10 text-left">
            <header className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Verify Break Out
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirm your password to end break and resume your shift.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBreakOutPasswordModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleConfirmEndBreak} className="mt-4 space-y-4">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Coffee size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {String(activeBreak.breakType || 'Break').split(' [')[0]}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ending break and returning to work
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Account Password to Confirm
                </label>
                <div
                  className={`flex items-center bg-white dark:bg-slate-900 border ${
                    breakOutPasswordError
                      ? 'border-rose-400 ring-2 ring-rose-400/20'
                      : 'border-slate-200 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
                  } rounded-2xl px-3.5 py-2.5 transition-all`}
                >
                  <input
                    type={showBreakOutPassword ? 'text' : 'password'}
                    value={breakOutPassword}
                    onChange={(e) => {
                      setBreakOutPassword(e.target.value);
                      if (breakOutPasswordError) setBreakOutPasswordError('');
                    }}
                    placeholder="Enter your account password to resume shift"
                    className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                    autoFocus
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBreakOutPassword((curr) => !curr)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    aria-label={showBreakOutPassword ? 'Hide password' : 'Show password'}
                  >
                    {showBreakOutPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {breakOutPasswordError && (
                  <p className="text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                    <ShieldCheck size={13} />
                    {breakOutPasswordError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={() => {
                    setBreakOutPasswordModalOpen(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={breakActionLoading || !breakOutPassword}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {breakActionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  Verify & Resume Work
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Command Palette Modal (Ctrl K) */}
      {commandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => setCommandOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10">
            <div className="flex items-center px-4 border-b border-slate-100">
              <Search className="w-5 h-5 text-slate-400 mr-2" />
              <input
                ref={commandInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything... (Ctrl + K)"
                className="w-full py-4 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
              />
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 rounded border border-slate-200">
                ESC
              </kbd>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto space-y-1">
              {showRoute('/dashboard/admin', isAdmin) && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/dashboard/admin');
                    setCommandOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Admin Dashboard</span>
                </button>
              )}
              {showRoute('/dashboard/employee') && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/dashboard/employee');
                    setCommandOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Employee Dashboard</span>
                </button>
              )}
              {showRoute('/manage-employee', canEmployees) && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/manage-employee');
                    setCommandOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Employee Directory</span>
                </button>
              )}
              {showRoute('/manage-attendance', canAttendance) && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/manage-attendance');
                    setCommandOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>Attendance Management</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: Themed Colored Sidebar */}
      <aside
        className={`erp-sb-aside fixed inset-y-0 left-0 z-40 shrink-0 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          width: 'var(--erp-sidebar-width, 248px)',
          backgroundColor: 'var(--erp-sidebar-bg, #111827)',
          borderRight: '1px solid var(--erp-sidebar-border, rgba(255, 255, 255, 0.08))',
        }}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Logo Header */}
          <div
            className="flex items-center justify-between px-4 shrink-0 transition-all"
            style={{
              height: 'var(--erp-navbar-height, 56px)',
              minHeight: 'var(--erp-navbar-height, 56px)',
              borderBottom: '1px solid var(--erp-sidebar-border, rgba(255, 255, 255, 0.08))',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="font-bold text-lg tracking-tight"
                style={{ color: 'var(--erp-sidebar-title-logo, #ffffff)' }}
              >
                TeamHub
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 18%, transparent)',
                  color: 'var(--erp-primary, #2563eb)',
                  borderColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 35%, transparent)',
                  borderWidth: 1,
                }}
              >
                ERP
              </span>
            </div>
            <button
              type="button"
              className="text-slate-400 hover:text-white lg:hidden cursor-pointer"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="erp-sb-nav flex-1 overflow-y-auto px-2.5 py-2 select-none">
            {/* 1. ADMINISTRATION WORKSPACE / DASHBOARDS */}
            {hasDashboards && (
              <div>
                <div className="erp-sb-section-title !mt-1">
                  {isAdmin || canHR ? 'ADMINISTRATION WORKSPACE' : 'DASHBOARDS'}
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setDashboardsOpen((prev) => !prev)}
                    className="erp-sb-dropdown-btn"
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutGrid size={16} />
                      <span className="font-medium">Dashboards</span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${dashboardsOpen ? '' : '-rotate-90'}`}
                    />
                  </button>

                  {dashboardsOpen && (
                    <div className="pl-1 space-y-1 pt-0.5">
                      {showRoute('/dashboard/admin', isAdmin) && (
                        <NavLink
                          to="/dashboard/admin"
                          className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                        >
                          <LayoutDashboard size={15} />
                          <span>Admin Dashboard</span>
                        </NavLink>
                      )}

                      {showRoute('/dashboard/employee') && (
                        <NavLink
                          to="/dashboard/employee"
                          className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                        >
                          <LayoutDashboard size={15} />
                          <span>Employee Dashboard</span>
                        </NavLink>
                      )}

                      {showRoute('/dashboard/hr', canHR) && (
                        <NavLink
                          to="/dashboard/hr"
                          className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                        >
                          <LayoutDashboard size={15} />
                          <span>HR Dashboard</span>
                        </NavLink>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. HR MANAGEMENT */}
            {hasHRRoutes && (
              <div>
                <div className="erp-sb-section-title">HR MANAGEMENT</div>
                <div className="space-y-1">
                  {showRoute('/manage-employee', canEmployees) && (
                    <NavLink
                      to="/manage-employee"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <Users size={16} />
                      <span>Employee Directory</span>
                    </NavLink>
                  )}

                  {showRoute('/manage-departments', canDepartments) && (
                    <NavLink
                      to="/manage-departments"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <LayoutGrid size={16} />
                      <span>Department Management</span>
                    </NavLink>
                  )}

                  {showRoute('/manage-attendance', canAttendance) && (
                    <NavLink
                      to="/manage-attendance"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <CalendarCheck size={16} />
                      <span>Attendance Management</span>
                    </NavLink>
                  )}

                  {showRoute('/manage-breaks', canBreaks) && (
                    <NavLink
                      to="/manage-breaks"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <Coffee size={16} />
                      <span>Daily Break Schedule</span>
                    </NavLink>
                  )}

                  {showRoute('/manage-leaves', canLeave) && (
                    <NavLink
                      to="/manage-leaves"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <CalendarDays size={16} />
                      <span>Leave Management</span>
                    </NavLink>
                  )}

                  {showRoute('/manage-interviews', canRecruit) && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setRecruitmentOpen((prev) => !prev)}
                        className={`erp-sb-dropdown-btn ${
                          isRecruitmentActive ? 'text-white font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <UserPlus size={16} />
                          <span className="font-medium">Recruitment Management</span>
                        </div>
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${recruitmentOpen ? '' : '-rotate-90'}`}
                        />
                      </button>

                      {recruitmentOpen && (
                        <div className="pl-1 space-y-1 pt-0.5">
                          <NavLink
                            to="/manage-interviews?section=daily"
                            className={() =>
                              `erp-sb-link ${
                                location.pathname === '/manage-interviews' &&
                                (!location.search || location.search.includes('section=daily'))
                                  ? 'active'
                                  : ''
                              }`
                            }
                          >
                            <UserPlus size={16} />
                            <span>Daily Candidates</span>
                          </NavLink>

                          <NavLink
                            to="/manage-interviews?section=interview"
                            className={() =>
                              `erp-sb-link ${
                                location.pathname === '/manage-interviews' &&
                                location.search.includes('section=interview')
                                  ? 'active'
                                  : ''
                              }`
                            }
                          >
                            <Briefcase size={16} />
                            <span>Candidate Pipeline</span>
                          </NavLink>

                          <NavLink
                            to="/manage-interviews?section=assessment"
                            className={() =>
                              `erp-sb-link ${
                                location.pathname === '/manage-interviews' &&
                                location.search.includes('section=assessment')
                                  ? 'active'
                                  : ''
                              }`
                            }
                          >
                            <FileCheck2 size={16} />
                            <span>Candidate Assessment</span>
                          </NavLink>

                          <NavLink
                            to="/manage-interviews?section=training"
                            className={() =>
                              `erp-sb-link ${
                                location.pathname === '/manage-interviews' &&
                                location.search.includes('section=training')
                                  ? 'active'
                                  : ''
                              }`
                            }
                          >
                            <GraduationCap size={16} />
                            <span>Training Candidates</span>
                          </NavLink>

                          <NavLink
                            to="/manage-interviews?section=agreements"
                            className={() =>
                              `erp-sb-link ${
                                (location.pathname === '/manage-interviews' &&
                                  location.search.includes('section=agreements')) ||
                                location.pathname.startsWith('/manage-agreements')
                                  ? 'active'
                                  : ''
                              }`
                            }
                          >
                            <FileSignature size={16} />
                            <span>Agreements & Joining</span>
                          </NavLink>
                        </div>
                      )}
                    </div>
                  )}

                  {showRoute('/profile-requests', canEmployees) && (
                    <NavLink
                      to="/profile-requests"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <UserCog size={16} />
                      <span> Profile Requests</span>
                    </NavLink>
                  )}

                  {showRoute('/work-reports', canEmployees) && (
                    <NavLink
                      to="/work-reports"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <FileText size={16} />
                      <span>Work Report Management</span>
                    </NavLink>
                  )}

                  {showRoute('/payrolls', canPayroll) && (
                    <NavLink
                      to="/payrolls"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <CreditCard size={16} />
                      <span>Payroll Management</span>
                    </NavLink>
                  )}

                  {showRoute('/salary-config', canPayroll) && (
                    <NavLink
                      to="/salary-config"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <WalletCards size={16} />
                      <span>Salary Structure</span>
                    </NavLink>
                  )}
                </div>
              </div>
            )}

            {/* 3. SELF SERVICE */}
            {hasSelfService && (
              <div>
                <div className="erp-sb-section-title">SELF SERVICE</div>
                <div className="space-y-1">
                  {showRoute('/attendance') && (
                    <NavLink
                      to="/attendance"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <Clock size={16} />
                      <span>My Attendance</span>
                    </NavLink>
                  )}

                  {showRoute('/leaves') && (
                    <NavLink
                      to="/leaves"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <CalendarDays size={16} />
                      <span>My Leaves</span>
                    </NavLink>
                  )}

                  {showRoute('/take-break') && (
                    <NavLink
                      to="/take-break"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <Coffee size={16} />
                      <span>My Breaks</span>
                    </NavLink>
                  )}

                  {showRoute('/my-payroll') && (
                    <NavLink
                      to="/my-payroll"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <Receipt size={16} />
                      <span>My Payroll</span>
                    </NavLink>
                  )}

                  {showRoute('/my-documents') && (
                    <NavLink
                      to="/my-documents"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <FolderOpen size={16} />
                      <span>My Documents</span>
                    </NavLink>
                  )}

                  {showRoute('/my-work-report') && (
                    <NavLink
                      to="/my-work-report"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <FileCheck2 size={16} />
                      <span>My Work Report</span>
                    </NavLink>
                  )}

                  {showRoute('/tasks') && (
                    <NavLink
                      to="/tasks"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <CheckSquare size={16} />
                      <span>My Tasks</span>
                    </NavLink>
                  )}
                </div>
              </div>
            )}

            {/* 5. COMPANY & CULTURE */}
            {hasCompany && (
              <div>
                <div className="erp-sb-section-title">COMPANY</div>
                <div className="space-y-1">
                  {showRoute('/announcements') && (
                    <NavLink
                      to="/announcements"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <Megaphone size={16} />
                      <span>Announcements</span>
                    </NavLink>
                  )}

                  {showRoute('/birthdays') && (
                    <NavLink
                      to="/birthdays"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <Cake size={16} />
                      <span>Birthdays</span>
                    </NavLink>
                  )}

                  {showRoute('/events') && (
                    <NavLink
                      to="/events"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <CalendarDays size={16} />
                      <span>Events</span>
                    </NavLink>
                  )}
                </div>
              </div>
            )}

            {/* 6. SYSTEM & CONFIGURATION */}
            {hasSystemRoutes && (
              <div>
                <div className="erp-sb-section-title">SYSTEM & CONFIG</div>
                <div className="space-y-1">
                  {showRoute('/manage-roles', canRoles) && (
                    <NavLink
                      to="/manage-roles"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <ShieldCheck size={16} />
                      <span>Roles & Permissions</span>
                    </NavLink>
                  )}

                  {showRoute('/manage-routes', canSettings) && (
                    <NavLink
                      to="/manage-routes"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <Route size={16} />
                      <span>Route Configuration</span>
                    </NavLink>
                  )}

                  {showRoute('/configurations', canSettings) && (
                    <NavLink
                      to="/configurations"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <SlidersHorizontal size={16} />
                      <span>Configuration List</span>
                    </NavLink>
                  )}

                  {showRoute('/manage-shift', canSettings) && (
                    <NavLink
                      to="/manage-shift"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <Clock size={16} />
                      <span>Shift Management</span>
                    </NavLink>
                  )}

                  {showRoute('/audit-logs', canAudit) && (
                    <NavLink
                      to="/audit-logs"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <FileText size={16} />
                      <span>Audit Logs</span>
                    </NavLink>
                  )}

                  {showRoute('/settings/appearance', isAdmin || canSettings) && (
                    <NavLink
                      to="/settings/appearance"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <Settings size={16} />
                      <span>System Settings</span>
                    </NavLink>
                  )}
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div
          className="p-3 shrink-0"
          style={{
            borderTop: '1px solid var(--erp-sidebar-border, rgba(255, 255, 255, 0.08))',
            backgroundColor: 'color-mix(in srgb, var(--erp-sidebar-bg, #111827) 92%, black)',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 w-full p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left cursor-pointer transition-colors group"
            title="View Profile"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                {user?.name || 'User'}
              </div>
              <div className="text-[10px] text-slate-400 capitalize truncate">
                {user?.role || 'Employee'}
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Navbar Matching Reference Design */}
        <header
          style={{
            height: 'var(--erp-navbar-height, 56px)',
            minHeight: 'var(--erp-navbar-height, 56px)',
          }}
          className="erp-top-header bg-white dark:bg-[#111827] border-b border-slate-200/80 dark:border-slate-800 px-2.5 sm:px-4 md:px-6 flex items-center justify-between shrink-0 z-30 transition-all gap-1.5 sm:gap-3"
        >
          {/* Left: Hamburger (Mobile only) & Search */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <button
              type="button"
              className="lg:hidden text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <Menu size={18} />
            </button>

            {/* Mobile Search Button (< sm) */}
            <button
              type="button"
              className="sm:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              onClick={() => {
                setCommandOpen(true);
                window.setTimeout(() => commandInputRef.current?.focus(), 0);
              }}
              aria-label="Search"
              title="Search anything... (Ctrl + K)"
            >
              <Search size={17} />
            </button>

            {/* Global Search Bar (Responsive: adapts smoothly across tablet & desktop) */}
            <div
              className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 w-36 md:w-56 lg:w-72 xl:w-96 cursor-text transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              onClick={() => {
                setCommandOpen(true);
                window.setTimeout(() => commandInputRef.current?.focus(), 0);
              }}
            >
              <Search size={14} className="text-slate-400 shrink-0" />
              <span className="text-xs text-slate-400 flex-1 truncate">
                Search anything... (Ctrl + K)
              </span>
            </div>
          </div>

          {/* Right: Quick Attendance/Breaks, Theme Toggle, Notifications, Mailbox, User Avatar */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-2.5 shrink-0">
            {user && (
              <>
                {/* Birthday Celebrant Pill: Compact & Sleek */}
                {birthdayCelebrant && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBirthdayPerson(birthdayCelebrant);
                      setShowBirthdayCelebration(true);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-yellow-500/15 hover:from-amber-500/25 hover:to-rose-500/25 border border-amber-300 dark:border-amber-400/50 text-amber-950 dark:text-amber-100 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95 text-xs font-semibold shrink-0"
                    title={`🎉 Today is ${birthdayCelebrant.name}'s Birthday! Click to celebrate! 🎂`}
                    aria-label={`Birthday celebration for ${birthdayCelebrant.name}`}
                  >
                    {/* Compact Avatar with Glowing Ring */}
                    <div className="w-5.5 h-5.5 rounded-full overflow-hidden birthday-avatar-glow ring-1.5 ring-amber-400 dark:ring-amber-300 flex items-center justify-center bg-slate-100 dark:bg-slate-800 shadow-xs shrink-0">
                      {birthdayCelebrant.profileImage ? (
                        <img
                          src={
                            /^(https?:|data:|blob:|\/)/.test(birthdayCelebrant.profileImage)
                              ? birthdayCelebrant.profileImage
                              : `/uploads/avatars/${birthdayCelebrant.profileImage}`
                          }
                          alt={birthdayCelebrant.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <span className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-rose-500 text-white font-black text-[9px] ${birthdayCelebrant.profileImage ? 'hidden' : 'flex'}`}>
                        {birthdayCelebrant.name ? birthdayCelebrant.name.slice(0, 2).toUpperCase() : '🎂'}
                      </span>
                    </div>

                    {/* Compact Name + Cake */}
                    <span className="font-extrabold text-xs truncate max-w-[55px] sm:max-w-[85px] text-slate-900 dark:text-amber-100 hidden xs:inline">
                      {birthdayCelebrant.name?.trim().split(/\s+/)[0] || 'Celebrant'}
                    </span>
                    <span className="text-[11px] leading-none shrink-0" title="Birthday!">
                      🎂
                    </span>
                  </button>
                )}

                {/* Single Combined Shift, Break & Check Out Option */}
                {attendanceStatus.loading ? (
                  <div className="h-7 w-16 sm:h-8 sm:w-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse hidden xs:block" />
                ) : attendanceStatus.isShiftCompleted ? (
                  attendanceStatus.isLatePenalty ? (
                    <div
                      className="px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 flex items-center gap-1 sm:gap-1.5 select-none shrink-0"
                      title="3rd late check-in penalty: 4.5 hours cut (Half Day)"
                    >
                      <Clock size={12} className="text-rose-600 dark:text-rose-400 stroke-[2.5] shrink-0" />
                      <span className="hidden sm:inline">Half Day (3rd Late)</span>
                      <span className="sm:hidden">Half Day</span>
                    </div>
                  ) : attendanceStatus.isEarlyCheckout ? (
                    <div
                      className="px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 flex items-center gap-1 sm:gap-1.5 select-none shrink-0"
                      title="Checked out early (< 7 hours - Half Day)"
                    >
                      <Clock size={12} className="text-amber-600 dark:text-amber-400 stroke-[2.5] shrink-0" />
                      <span className="hidden sm:inline">Early Checkout</span>
                      <span className="sm:hidden">Early</span>
                    </div>
                  ) : (
                    <div
                      className="px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 flex items-center gap-1 sm:gap-1.5 select-none shrink-0"
                      title="Shift completed for today"
                    >
                      <Check size={12} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5] shrink-0" />
                      <span className="hidden sm:inline">Shift Done</span>
                      <span className="sm:hidden">Done</span>
                    </div>
                  )
                ) : !attendanceStatus.isPunchedIn ? (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={punchLoading}
                    className="px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs hover:shadow-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    title="Check in for today's shift"
                  >
                    {punchLoading ? <Loader2 size={12} className="animate-spin shrink-0" /> : <LogIn size={12} className="shrink-0" />}
                    <span className="hidden xs:inline">Check In</span>
                    <span className="xs:hidden">In</span>
                  </button>
                ) : (
                  /* Single Option on Navbar containing both Break & Check Out */
                  <div className="relative" ref={shiftMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !shiftMenuOpen;
                        setShiftMenuOpen(next);
                        if (next && !activeBreak) fetchBreaks();
                      }}
                      className={`px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-xl text-xs sm:text-[13px] font-semibold border transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 shadow-xs shrink-0 ${
                        activeBreak
                          ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse'
                          : shiftMenuOpen
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600'
                          : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                      }`}
                      title={activeBreak ? 'On Break - Click for shift options' : 'Shift Active - Click for break and check out options'}
                    >
                      {activeBreak ? (
                        <>
                          <Coffee size={13} className="shrink-0" />
                          <span className="text-xs">
                            <span className="hidden xs:inline">Break Out </span>
                            <span className="font-mono text-[11px] sm:text-xs font-bold opacity-90">({formatBreakTimer(timeLeft, elapsedExceeded)})</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span className="flex items-center gap-1 font-semibold text-xs sm:text-[13px]">
                            <span className="hidden md:inline">On Shift</span>
                            {attendanceStatus.loginTime && (
                              <span className="font-mono text-[11px] sm:text-xs md:text-[13px] font-extrabold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/70 px-1.5 sm:px-2 py-0.5 rounded-md tracking-normal shadow-2xs">
                                {elapsedShiftTime}
                              </span>
                            )}
                          </span>
                        </>
                      )}
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 shrink-0 ${shiftMenuOpen ? 'rotate-180' : ''} ${
                          activeBreak ? 'text-amber-100' : 'text-slate-400'
                        }`}
                      />
                    </button>

                    {/* Unified Dropdown Menu for Breaks and Check Out */}
                    {shiftMenuOpen && (
                      <div className="absolute right-0 mt-2 w-[calc(100vw-20px)] max-w-xs sm:w-80 bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 text-left">
                        {/* Status Header */}
                        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-2 flex items-center justify-between border border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${activeBreak ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {activeBreak ? 'On Break' : 'Shift Active'}
                              </p>
                              {attendanceStatus.loginTime && (
                                <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                  <span>Checked in at {formatLoginTime(attendanceStatus.loginTime)}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              activeBreak
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            }`}>
                              {activeBreak ? 'Break' : 'Working'}
                            </span>
                            {!activeBreak && attendanceStatus.loginTime && (
                              <span className="font-mono text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none mt-1">
                                {elapsedShiftTime}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Late Notice */}
                        {(attendanceStatus.isLatePenalty || attendanceStatus.isLateCheckIn) && (
                          <div className="px-2.5 py-1 mb-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                            <Clock size={12} className="shrink-0 text-amber-500" />
                            <span>Late check in</span>
                          </div>
                        )}

                        {/* Breaks Section */}
                        <div className="mb-2">
                          {activeBreak ? (
                            <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 truncate pr-2">
                                  <Coffee size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span className="truncate">{String(activeBreak.breakType || 'Break').split(' [')[0]}</span>
                                </span>
                                <span className="text-sm sm:text-base font-mono font-black text-amber-700 dark:text-amber-300 shrink-0">
                                  {formatBreakTimer(timeLeft, elapsedExceeded)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handleOpenBreakOutModal();
                                }}
                                disabled={breakActionLoading}
                                className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {breakActionLoading ? <Loader2 size={13} className="animate-spin" /> : <LockKeyhole size={13} />}
                                <span>Break Out (Enter Password)</span>
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div className="px-2 py-0.5 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1">
                                  <Coffee size={10} className="text-amber-500" />
                                  Break Options
                                </span>
                                <span className="text-[8.5px] lowercase font-normal">1-click start</span>
                              </div>

                              <div className="max-h-36 overflow-y-auto space-y-0.5 py-0.5">
                                {loadingBreaks ? (
                                  <div className="p-2 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                    <Loader2 size={12} className="animate-spin" />
                                    Loading breaks...
                                  </div>
                                ) : availableBreaks.length > 0 ? (
                                  availableBreaks.map((item, idx) => {
                                    const duration = calculateBreakDuration(item);
                                    return (
                                      <button
                                        key={item.id || item._id || idx}
                                        type="button"
                                        onClick={() => handleSelectBreak(item)}
                                        disabled={breakActionLoading}
                                        className="w-full px-2 py-0.5 rounded-md text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between group cursor-pointer"
                                      >
                                        <div className="min-w-0 pr-1.5">
                                          <p className="text-[10px] font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 leading-tight">
                                            {item.breakType}
                                          </p>
                                          {item.fromTime && item.toTime && (
                                            <p className="text-[8.5px] text-slate-400 leading-none mt-0.5">
                                              {item.fromTime} - {item.toTime}
                                            </p>
                                          )}
                                        </div>
                                        <span className="shrink-0 text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60 group-hover:text-amber-700 dark:group-hover:text-amber-300">
                                          {duration}m
                                        </span>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="py-2 px-2 text-center text-[10px] text-slate-400">
                                    No breaks defined in Daily Break Administration
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setShiftMenuOpen(false);
                                  navigate('/take-break');
                                }}
                                className="w-full px-2 py-0.5 text-left text-[9.5px] text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center justify-between cursor-pointer"
                              >
                                <span>Custom break request</span>
                                <span>→</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100 dark:border-slate-800/80 my-1.5" />

                        {/* Check Out Option */}
                        <button
                          type="button"
                          onClick={() => {
                            if (activeBreak) {
                              feedback.warning('You are currently on a break. You must break out (end your break) before checking out.');
                              return;
                            }
                            setShiftMenuOpen(false);
                            handleCheckOut();
                          }}
                          disabled={Boolean(activeBreak) || punchLoading}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                            activeBreak
                              ? 'bg-slate-100 text-slate-400 border border-slate-200/60 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800 cursor-not-allowed opacity-60'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 dark:hover:bg-rose-900/50 cursor-pointer group'
                          }`}
                          title={activeBreak ? 'You must break out before checking out' : 'End shift for today'}
                        >
                          <div className="flex items-center gap-2">
                            {punchLoading ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} className={activeBreak ? "text-slate-400" : "text-rose-600 dark:text-rose-400"} />}
                            <span>Check Out</span>
                          </div>
                          <span className={`text-[10px] font-normal ${activeBreak ? 'text-slate-400 dark:text-slate-500' : 'text-rose-400 dark:text-rose-500 group-hover:underline'}`}>
                            {activeBreak ? 'Break out required first' : 'End shift for today'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="h-4 sm:h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block" />
              </>
            )}

            <button
              type="button"
              onClick={() => updateAppearance({ mode: isDark ? 'light' : 'dark' })}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 sm:p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Moon size={16} className="text-amber-400 sm:w-[18px] sm:h-[18px]" /> : <Sun size={16} className="sm:w-[18px] sm:h-[18px]" />}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 sm:p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative shrink-0"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
                {unreadCount > 0 && (
                  <span className="min-w-3.5 h-3.5 sm:min-w-4 sm:h-4 px-0.5 sm:px-1 rounded-full bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center absolute top-0.5 right-0.5 sm:top-1 sm:right-1 ring-1.5 sm:ring-2 ring-white dark:ring-slate-900">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-20px)] max-w-sm sm:w-96 bg-white dark:bg-[#111827] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-900/40">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck size={13} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                        <Bell size={26} className="mx-auto mb-2 opacity-40 text-slate-400" />
                        <span className="font-medium text-slate-600 dark:text-slate-400 block">No notifications yet</span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">You're all caught up!</span>
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item._id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start gap-3 text-left ${!item.readAt ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                            }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-500 transition-opacity"
                            style={{ opacity: item.readAt ? 0 : 1 }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {item.title || 'Notification'}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {formatTimeAgo(item.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                              {item.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative ml-0.5 sm:ml-1 flex items-center gap-1 shrink-0" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-1 sm:gap-2 p-0.5 sm:p-1 pr-1 sm:pr-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                title="Account menu"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden ring-1.5 sm:ring-2 ring-slate-200 dark:ring-slate-700 flex items-center justify-center bg-slate-100 dark:bg-slate-800 shadow-sm text-white font-bold text-xs shrink-0">
                  {resolvedAvatarUrl ? (
                    <img
                      src={resolvedAvatarUrl}
                      alt={user?.name || 'Profile'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          e.currentTarget.nextElementSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <span className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-rose-500 text-white font-bold text-xs ${resolvedAvatarUrl ? 'hidden' : 'flex'}`}>
                    {initials}
                  </span>
                </div>
                <span className="hidden xl:inline-block text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[80px] truncate">
                  {user?.name?.split(' ')[0] || 'User'}
                </span>
                <ChevronDown size={12} className="text-slate-400 hidden xs:block shrink-0" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#111827] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-1.5 z-50">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user?.name || 'User'}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize truncate">{user?.role || 'Employee'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer font-medium whitespace-nowrap text-left transition-colors"
                  >
                    <CircleUserRound size={15} className="shrink-0 text-slate-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/settings/appearance');
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer font-medium whitespace-nowrap text-left transition-colors"
                  >
                    <Palette size={15} className="shrink-0 text-slate-400" />
                    <span>Appearance & Theme</span>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/configurations');
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer font-medium whitespace-nowrap text-left transition-colors"
                    >
                      <SlidersHorizontal size={15} className="shrink-0 text-slate-400" />
                      <span>Configurations</span>
                    </button>
                  )}
                  {canRoles && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/manage-roles');
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer font-medium whitespace-nowrap text-left transition-colors"
                    >
                      <LockKeyhole size={15} className="shrink-0 text-slate-400" />
                      <span>Permissions</span>
                    </button>
                  )}
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      handleLogout();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 cursor-pointer font-medium whitespace-nowrap text-left transition-colors"
                  >
                    <LogOut size={15} className="shrink-0 text-rose-500" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Main Viewport */}
        <main className="flex-1 w-full overflow-y-auto bg-[#f8fafc] dark:bg-[#0b0f17]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;