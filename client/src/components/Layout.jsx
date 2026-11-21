import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
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
  FileText,
  FolderOpen,
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [dashboardsOpen, setDashboardsOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [shiftMenuOpen, setShiftMenuOpen] = useState(false);
  const [dailyBreaks, setDailyBreaks] = useState([]);
  const [loadingBreaks, setLoadingBreaks] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const [breakActionLoading, setBreakActionLoading] = useState(false);

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

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications?limit=15');
      setNotifications(res.data?.items || []);
      setUnreadCount(Number(res.data?.unreadCount || 0));
    } catch {
      // silently ignore background poll
    }
  }, []);

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

  const handleCheckIn = async () => {
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
                    placeholder="Enter your login password..."
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
                    placeholder="Enter your login password"
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
                    <NavLink
                      to="/manage-interviews"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <UserPlus size={16} />
                      <span>Recruitment Management</span>
                    </NavLink>
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
          className="erp-top-header bg-white dark:bg-[#111827] border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 transition-all"
        >
          {/* Left: Hamburger (Mobile only) & Search */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <Menu size={18} />
            </button>

            {/* Global Search Bar with exact reference mockup placeholder */}
            <div
              className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-1.5 w-64 sm:w-80 md:w-96 cursor-text transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              onClick={() => {
                setCommandOpen(true);
                window.setTimeout(() => commandInputRef.current?.focus(), 0);
              }}
            >
              <Search size={15} className="text-slate-400 shrink-0" />
              <span className="text-xs sm:text-sm text-slate-400 flex-1 truncate">
                Search anything... (Ctrl + K)
              </span>
            </div>
          </div>

          {/* Right: Quick Attendance/Breaks, Theme Toggle, Notifications, Mailbox, User Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {user && (
              <>
                {/* Single Combined Shift, Break & Check Out Option */}
                {attendanceStatus.loading ? (
                  <div className="h-8 w-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse hidden xs:block" />
                ) : attendanceStatus.isShiftCompleted ? (
                  attendanceStatus.isLatePenalty ? (
                    <div
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 flex items-center gap-1.5 select-none"
                      title="3rd late check-in penalty: 4.5 hours cut (Half Day)"
                    >
                      <Clock size={13} className="text-rose-600 dark:text-rose-400 stroke-[2.5]" />
                      <span>Half Day (3rd Late)</span>
                    </div>
                  ) : attendanceStatus.isEarlyCheckout ? (
                    <div
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 flex items-center gap-1.5 select-none"
                      title="Checked out early (< 7 hours - Half Day)"
                    >
                      <Clock size={13} className="text-amber-600 dark:text-amber-400 stroke-[2.5]" />
                      <span>Early Checkout</span>
                    </div>
                  ) : (
                    <div
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 flex items-center gap-1.5 select-none"
                      title="Shift completed for today"
                    >
                      <Check size={13} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                      <span>Shift Done</span>
                    </div>
                  )
                ) : !attendanceStatus.isPunchedIn ? (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={punchLoading}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs hover:shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    title="Check in for today's shift"
                  >
                    {punchLoading ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />}
                    <span>Check In</span>
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
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
                          <Coffee size={13} />
                          <span>
                            Break Out <span className="font-mono text-[11px] opacity-90 hidden sm:inline">({formatBreakTimer(timeLeft, elapsedExceeded)})</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span>On Shift</span>
                        </>
                      )}
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 ${shiftMenuOpen ? 'rotate-180' : ''} ${
                          activeBreak ? 'text-amber-100' : 'text-slate-400'
                        }`}
                      />
                    </button>

                    {/* Unified Dropdown Menu for Breaks and Check Out */}
                    {shiftMenuOpen && (
                      <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 text-left">
                        {/* Status Header */}
                        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-2 flex items-center justify-between border border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${activeBreak ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {activeBreak ? 'On Break' : 'Shift Active'}
                              </p>
                              {attendanceStatus.loginTime && (
                                <p className="text-[10px] text-slate-400 truncate">
                                  Checked in at {formatLoginTime(attendanceStatus.loginTime)}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            activeBreak
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          }`}>
                            {activeBreak ? 'Break' : 'Working'}
                          </span>
                        </div>

                        {/* Late Warning / Deduction Notice */}
                        {attendanceStatus.isLatePenalty && (
                          <div className="px-3 py-1.5 mb-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200/80 dark:border-rose-800/60 text-[11px] text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1.5">
                            <Clock size={13} className="shrink-0 text-rose-500" />
                            <span>3rd late check-in: 4.5h half-day deduction applied.</span>
                          </div>
                        )}
                        {!attendanceStatus.isLatePenalty && attendanceStatus.isLateCheckIn && (
                          <div className="px-3 py-1.5 mb-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5">
                            <Clock size={13} className="shrink-0 text-amber-500" />
                            <span>Late check-in recorded ({attendanceStatus.lateCountInMonth}/3 toward half-day cut).</span>
                          </div>
                        )}

                        {/* Breaks Section */}
                        <div className="mb-2">
                          {activeBreak ? (
                            <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 truncate pr-2">
                                  <Coffee size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span className="truncate">{String(activeBreak.breakType || 'Break').split(' [')[0]}</span>
                                </span>
                                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 shrink-0">
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
                              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5">
                                  <Coffee size={12} className="text-amber-500" />
                                  Break Options
                                </span>
                                <span className="text-[10px] lowercase font-normal">1-click start</span>
                              </div>

                              <div className="max-h-48 overflow-y-auto space-y-0.5 py-1">
                                {loadingBreaks ? (
                                  <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                    <Loader2 size={13} className="animate-spin" />
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
                                        className="w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between group cursor-pointer"
                                      >
                                        <div className="min-w-0 pr-2">
                                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">
                                            {item.breakType}
                                          </p>
                                          {item.fromTime && item.toTime && (
                                            <p className="text-[10px] text-slate-400">
                                              {item.fromTime} - {item.toTime}
                                            </p>
                                          )}
                                        </div>
                                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60 group-hover:text-amber-700 dark:group-hover:text-amber-300">
                                          {duration}m
                                        </span>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="py-3 px-2 text-center text-xs text-slate-400">
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
                                className="w-full px-2.5 py-1 text-left text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center justify-between cursor-pointer"
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

                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 hidden xs:block" />
              </>
            )}

            <button
              type="button"
              onClick={() => updateAppearance({ mode: isDark ? 'light' : 'dark' })}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Moon size={18} className="text-amber-400" /> : <Sun size={18} />}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center absolute top-1 right-1 ring-2 ring-white dark:ring-slate-900">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#111827] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 overflow-hidden">
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

            {/* Profile Avatar Pill */}
            <div className="relative ml-1" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-1.5 p-1 pr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                title="Account menu"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold flex items-center justify-center ring-2 ring-slate-100 dark:ring-slate-800 shadow-2xs">
                  {initials}
                </div>
                <span className="hidden md:inline-block text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[90px] truncate">
                  {user?.name?.split(' ')[0] || 'User'}
                </span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#111827] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-1.5 z-50">
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