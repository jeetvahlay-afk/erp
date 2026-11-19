import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Cake,
  CalendarCheck,
  CalendarDays,
  CheckCheck,
  CheckSquare,
  ChevronDown,
  CircleUserRound,
  Clock,
  Coffee,
  CreditCard,
  FileCheck2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  Mail,
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
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { feedback } from '../lib/feedback';
import { ADMIN_ROLES, HR_ROLES, RECRUITMENT_ROLES, hasPermission, hasRole } from '../lib/access';
import BreakOverlay from './BreakOverlay';
import ShiftOvertimeModal from './ShiftOvertimeModal';
import { useTheme } from '../context/ThemeContext';
import { isAdministrator } from '../lib/routeAccess';

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

const Layout = () => {
  const { user, logout } = useAuth();
  const { appearance, updateAppearance } = useTheme();
  const isDark = appearance?.mode === 'dark' || (appearance?.mode === 'system' && (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches));
  const navigate = useNavigate();
  const location = useLocation();
  const commandInputRef = useRef(null);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [dashboardsOpen, setDashboardsOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const assignedRoutes = Array.isArray(user?.allowedRoutes) ? user.allowedRoutes : [];
  const routeAccessBypass = isAdministrator(user);
  const routeIsAssigned = (path) =>
    assignedRoutes.includes(path) ||
    (path === '/attendance-register' && assignedRoutes.includes('/manage-attendance')) ||
    (path === '/manage-breaks' && (assignedRoutes.includes('/manage-attendance') || assignedRoutes.includes('/configurations')));

  const showRoute = (path, functionalAccess = true) =>
    functionalAccess && (routeAccessBypass || routeIsAssigned(path));

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
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
    setCommandOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

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

                    <NavLink
                      to="/dashboard/employee"
                      className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                    >
                      <LayoutDashboard size={15} />
                      <span>Employee Dashboard</span>
                    </NavLink>

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

            {/* 2. HR MANAGEMENT */}
            {(canEmployees || canDepartments || canAttendance || canBreaks || canLeave || canRecruit || canPayroll) && (
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
            <div>
              <div className="erp-sb-section-title">SELF SERVICE</div>
              <div className="space-y-1">
                <NavLink
                  to="/attendance"
                  className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                >
                  <Clock size={16} />
                  <span>My Attendance</span>
                </NavLink>

                <NavLink
                  to="/leaves"
                  className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                >
                  <CalendarDays size={16} />
                  <span>My Leaves</span>
                </NavLink>

                <NavLink
                  to="/take-break"
                  className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                >
                  <Coffee size={16} />
                  <span>My Breaks</span>
                </NavLink>

                <NavLink
                  to="/my-payroll"
                  className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                >
                  <Receipt size={16} />
                  <span>My Payroll</span>
                </NavLink>

                <NavLink
                  to="/my-documents"
                  className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                >
                  <FolderOpen size={16} />
                  <span>My Documents</span>
                </NavLink>

                <NavLink
                  to="/my-work-report"
                  className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                >
                  <FileCheck2 size={16} />
                  <span>My Work Report</span>
                </NavLink>
              </div>
            </div>

            {/* 4. WORKSPACE & PRODUCTIVITY */}
            <div>
              <div className="erp-sb-section-title">WORKSPACE</div>
              <div className="space-y-1">
                <NavLink
                  to="/tasks"
                  className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                >
                  <CheckSquare size={16} />
                  <span>Tasks</span>
                </NavLink>

                <NavLink
                  to="/mail/inbox"
                  className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                >
                  <Mail size={16} />
                  <span>Mailbox</span>
                </NavLink>
              </div>
            </div>

            {/* 5. COMPANY & CULTURE */}
            <div>
              <div className="erp-sb-section-title">COMPANY</div>
              <div className="space-y-1">
                <NavLink
                  to="/announcements"
                  className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                >
                  <Megaphone size={16} />
                  <span>Announcements</span>
                </NavLink>

                <NavLink
                  to="/birthdays"
                  className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                >
                  <Cake size={16} />
                  <span>Birthdays</span>
                </NavLink>

                <NavLink
                  to="/events"
                  className={({ isActive }) => `erp-sb-link ${isActive ? 'active' : ''}`}
                >
                  <CalendarDays size={16} />
                  <span>Events</span>
                </NavLink>
              </div>
            </div>

            {/* 5. SYSTEM & CONFIGURATION (Administrator only) */}
            {(isAdmin || (canRoles && showRoute('/manage-roles', canRoles)) || (canAudit && showRoute('/audit-logs', canAudit))) && (
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

                  {isAdmin && (
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

          {/* Right: Theme Toggle, Notifications, Mailbox, User Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
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

            <button
              type="button"
              onClick={() => navigate('/mail/inbox')}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Mailbox"
            >
              <Mail size={18} />
            </button>

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