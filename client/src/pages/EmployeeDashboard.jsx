import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Clock,
  CreditCard,
  Download,
  IdCard,
  LogOut,
  Mail,
  Phone,
  Umbrella,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useLiveData from '../hooks/useLiveData';
import api, { getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import { ErrorState, LoadingState } from '../components/ui/EnterpriseUI';

const formatTime12 = (isoOrDate) => {
  if (!isoOrDate) return '—';
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatElapsed = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds));
  const hrs = String(Math.floor(total / 3600)).padStart(2, '0');
  const mins = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const secs = String(total % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
};

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useLiveData('/api/dashboard/employee');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const employee = data?.user || user;
  const attendance = data?.attendance || {};
  const leaves = data?.leaves || {};
  const isPunchedIn = Boolean(attendance?.today?.loginTime && !attendance?.today?.logoutTime);
  const isShiftCompleted = Boolean(attendance?.today?.loginTime && attendance?.today?.logoutTime);

  const punch = async () => {
    if (isShiftCompleted) {
      feedback.info('Shift has already ended for today. You cannot punch in again.');
      return;
    }
    if (isPunchedIn) {
      const accepted = await feedback.confirm(
        'Are you sure you want to punch out and complete your shift for today? Re-entry is locked until your next shift.',
        {
          title: 'Confirm Punch Out',
          confirmLabel: 'Punch Out',
          tone: 'danger',
        }
      );
      if (!accepted) return;
    }
    try {
      const action = isPunchedIn ? 'out' : 'in';
      await api.post('/api/attendance/punch', { action });
      feedback.success(isPunchedIn ? 'Punched out successfully' : 'Punched in successfully');
      refresh();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Attendance punch failed'));
    }
  };

  const elapsedToday = useMemo(() => {
    if (!attendance?.today?.loginTime) return '00:00:00';
    const start = new Date(attendance.today.loginTime).getTime();
    const end = attendance.today.logoutTime ? new Date(attendance.today.logoutTime).getTime() : now.getTime();
    const diffSeconds = Math.max(0, (end - start) / 1000);
    return formatElapsed(diffSeconds);
  }, [attendance?.today?.loginTime, attendance?.today?.logoutTime, now]);

  const productiveToday = useMemo(() => {
    if (!attendance?.today?.loginTime) return 0;
    const start = new Date(attendance.today.loginTime).getTime();
    const end = attendance.today.logoutTime ? new Date(attendance.today.logoutTime).getTime() : now.getTime();
    const totalSeconds = Math.max(0, (end - start) / 1000);
    const breakSeconds = (attendance?.today?.totalBreakMinutes || 0) * 60;
    return Math.max(0, totalSeconds - breakSeconds);
  }, [attendance?.today?.loginTime, attendance?.today?.logoutTime, attendance?.today?.totalBreakMinutes, now]);

  if (loading && !data) return <LoadingState label="Loading employee dashboard…" />;
  if (error && !data) return <ErrorState message={error} retry={refresh} />;

  const targetHours = 9;
  const workedHoursDecimal = productiveToday / 3600;
  const progressPercent = Math.min(100, Math.round((workedHoursDecimal / targetHours) * 100));

  const totalLeaves = leaves.balance ?? 13;
  const takenLeaves = leaves.taken ?? 0;
  const pendingLeaves = leaves.pending ?? 0;
  const breakMinutes = attendance?.today?.totalBreakMinutes || 0;

  const initials = employee?.name
    ? employee.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'EM';

  const joinedDate = employee?.createdAt
    ? new Date(employee.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '23 Oct 2026';

  const checkInTime = attendance?.today?.loginTime ? formatTime12(attendance.today.loginTime) : '—';
  const checkOutTime = attendance?.today?.logoutTime ? formatTime12(attendance.today.logoutTime) : '—';

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header / Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Hello, {employee?.name || 'Super Admin'} 👋
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Welcome to your employee dashboard. Here is your daily summary and schedule.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
            <Calendar size={13} className="text-slate-400" />
            <span>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
          >
            <Download size={13} className="text-slate-400" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Metric KPI Cards (MatDash Minimal Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Worked Today</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {elapsedToday}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Target: 09:00:00</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock size={19} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Hours This Week</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {Number(attendance?.totalHoursWeek || 6.36).toFixed(2)}h
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">45h weekly scheduled</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Calendar size={19} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Hours This Month</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {Number(attendance?.totalHoursMonth || 6.36).toFixed(2)}h
            </div>
            <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">Current pay period</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CalendarDays size={19} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Leave Balance</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {totalLeaves} Days
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">{takenLeaves} days taken this year</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Umbrella size={19} />
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Grid: Left Content (8 cols) + Right Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-4.5">
          {/* Card: Today's Shift & Attendance Tracker */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <CalendarCheck size={16} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Shift &amp; Attendance Tracker</h2>
                  <p className="text-[11px] text-slate-500 mt-0.2">Real-time daily work hours tracking</p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isShiftCompleted
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60'
                    : isPunchedIn
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isShiftCompleted
                      ? 'bg-blue-500'
                      : isPunchedIn
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-400'
                  }`}
                />
                <span>{isShiftCompleted ? 'Shift Completed' : isPunchedIn ? 'On Shift' : 'Off Shift'}</span>
              </span>
            </div>

            {/* Time Display & Punch Action */}
            <div className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Current Time</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {formatTime12(now)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>Worked: <strong className="text-slate-800 dark:text-slate-200">{elapsedToday}</strong></span>
                  <span>•</span>
                  <span>Target: 09:00:00</span>
                </div>
                {isShiftCompleted && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Shift ended for today. Re-entry is locked until next scheduled shift.
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={isShiftCompleted}
                onClick={punch}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs ${
                  isShiftCompleted
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                    : isPunchedIn
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white cursor-pointer'
                    : 'bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white cursor-pointer'
                }`}
              >
                <LogOut size={15} className={isPunchedIn ? 'rotate-180' : ''} />
                <span>{isShiftCompleted ? 'Shift Completed' : isPunchedIn ? 'Punch Out' : 'Punch In'}</span>
              </button>
            </div>

            {/* Progress Bar towards 9h target */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Daily Target Progress</span>
                <span className="font-semibold text-slate-900 dark:text-white">{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2563eb] transition-all duration-700 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Shift Breakdown Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Check In</span>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5">{checkInTime}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Check Out</span>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5">{checkOutTime}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Break Time</span>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5">{breakMinutes}m</strong>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Productive</span>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5">{formatElapsed(productiveToday)}</strong>
              </div>
            </div>
          </div>

          {/* Card: Recent Attendance History */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Recent Attendance Records</h3>
                <p className="text-[11px] text-slate-500 mt-0.2">Your latest recorded logins and shifts</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/attendance')}
                className="text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] transition-colors cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">03</span>
                    <span className="text-[9px] text-slate-500 uppercase leading-none">Nov</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block text-xs sm:text-sm">02:53 PM – 07:12 PM</span>
                    <span className="text-[11px] text-slate-500 block">4.31 working hours recorded</span>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  Present
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">22</span>
                    <span className="text-[9px] text-slate-500 uppercase leading-none">Oct</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block text-xs sm:text-sm">04:49 AM – 05:10 AM</span>
                    <span className="text-[11px] text-slate-500 block">0.35 working hours recorded</span>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  Present
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-4.5">
          {/* Card: Employee Profile Card (Pure White, Minimal) */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563eb] font-bold text-lg flex items-center justify-center mx-auto mb-2 border border-blue-100 dark:border-blue-900/40">
              {initials}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
              {employee?.name || 'System Super Admin'}
            </h3>
            <span className="text-xs text-slate-500 block mt-0.5">
              {employee?.designation || employee?.role || 'Super Admin'}
            </span>

            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Building2 size={12} className="text-slate-400" />
              <span>{employee?.department || 'Unassigned'}</span>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <IdCard size={13} className="text-slate-400" />
                  Employee ID
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">{employee?.employeeId || 'Vah0001'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  Joined Date
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">{joinedDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" />
                  Email
                </span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px]" title={employee?.email}>
                  {employee?.email || 'superadmin@erp.local'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-400" />
                  Phone
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">{employee?.phone || 'Not provided'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/employee/${employee?._id || user?._id || ''}`)}
              className="w-full mt-3.5 py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              View Full Profile
            </button>
          </div>

          {/* Card: Leave Balances & Quick Apply */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Leave Balances</h3>
              <button
                type="button"
                onClick={() => navigate('/leaves')}
                className="text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] transition-colors cursor-pointer"
              >
                Apply Leave
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-600 dark:text-slate-400">Sick Leave</span>
                <span className="font-semibold text-slate-900 dark:text-white">Unlimited</span>
              </div>
              <div className="flex items-center justify-between py-0.5 border-t border-slate-50 dark:border-slate-800/50">
                <span className="text-slate-600 dark:text-slate-400">Casual Leave</span>
                <span className="font-semibold text-slate-900 dark:text-white">Unlimited</span>
              </div>
              <div className="flex items-center justify-between py-0.5 border-t border-slate-50 dark:border-slate-800/50">
                <span className="text-slate-600 dark:text-slate-400">Paid Leave</span>
                <span className="font-semibold text-slate-900 dark:text-white">12 Days</span>
              </div>
              <div className="flex items-center justify-between py-0.5 border-t border-slate-50 dark:border-slate-800/50">
                <span className="text-slate-600 dark:text-slate-400">Birthday Leave</span>
                <span className="font-semibold text-slate-900 dark:text-white">1 Day</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Pending Requests</span>
              <span className="font-bold text-amber-600">{pendingLeaves}</span>
            </div>
          </div>

          {/* Card: Quick Payslips */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-3.5 sm:p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-1.5">
              <div className="flex items-center gap-1.5">
                <CreditCard size={14} className="text-[#2563eb]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payroll</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/my-payroll')}
                className="text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] transition-colors cursor-pointer"
              >
                Payslips
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              No new payslips pending. Access your monthly salary slips anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
