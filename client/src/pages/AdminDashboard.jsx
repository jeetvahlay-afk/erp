import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Briefcase,
  Calendar,
  CalendarCheck,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Timer,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import useLiveData from '../hooks/useLiveData';
import api, { getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import { LoadingState, ErrorState } from '../components/ui/EnterpriseUI';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useLiveData('/api/dashboard/admin');
  const [attendancePeriod, setAttendancePeriod] = useState('week');
  const [payrollPeriod, setPayrollPeriod] = useState('6months');

  const kpis = data?.kpis || {};
  const totalStaff = kpis.totalEmployees || 0;
  const activeStaff = kpis.activeEmployees || 0;
  const presentToday = kpis.presentToday || 0;
  const payrollAmount = kpis.payrollNet || 0;
  const rec = data?.recruitment || {};

  // 7-day attendance distribution from real data
  const attendanceDays = useMemo(() => {
    if (Array.isArray(data?.weeklyAttendance) && data.weeklyAttendance.length > 0) {
      return data.weeklyAttendance.map((item) => ({
        day: item.label || item.date,
        present: item.present || 0,
        late: item.late || 0,
        absent: item.absent || 0,
      }));
    }
    return [];
  }, [data?.weeklyAttendance]);

  // Department Breakdown from real distribution
  const departments = useMemo(() => {
    if (Array.isArray(data?.distribution) && data.distribution.length > 0) {
      return data.distribution.map((item) => {
        const count = Number(item.value || 0);
        const percentage = totalStaff > 0 ? Number(((count / totalStaff) * 100).toFixed(1)) : 0;
        return {
          name: item.label || 'Unassigned',
          count,
          percentage,
        };
      });
    }
    return [];
  }, [data?.distribution, totalStaff]);

  // Pending Leave Approvals from real data
  const pendingLeaves = useMemo(() => {
    if (Array.isArray(data?.pendingApprovals) && data.pendingApprovals.length > 0) {
      return data.pendingApprovals.map((leave) => {
        const start = leave.startDate ? new Date(leave.startDate) : null;
        const end = leave.endDate ? new Date(leave.endDate) : null;
        const days = start && end ? Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1) : 1;
        const avatar = leave.user?.profileImage
          ? (leave.user.profileImage.startsWith('http') ? leave.user.profileImage : `/api/users/${leave.user._id}/avatar`)
          : '';
        return {
          id: leave._id,
          name: leave.user?.name || 'Staff Member',
          avatar,
          leaveType: leave.leaveType || 'Leave',
          from: start ? start.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—',
          to: end ? end.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—',
          days,
        };
      });
    }
    return [];
  }, [data?.pendingApprovals]);

  const handleLeaveDecision = async (leaveId, status) => {
    try {
      await api.put(`/api/leaves/${leaveId}/status`, { status });
      feedback.success(`Leave request ${status.toLowerCase()}`);
      refresh();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to update leave status'));
    }
  };

  // Payroll Trend Line Points calculated from real trend data
  const payrollPoints = useMemo(() => {
    const trend = Array.isArray(data?.payrollTrend) ? data.payrollTrend : [];
    if (!trend.length) return [];
    const maxNet = Math.max(...trend.map((t) => Number(t.net || 0)), 1);
    const minNet = 0;
    const range = maxNet - minNet || 1;
    return trend.map((t, index) => {
      const net = Number(t.net || 0);
      const x = trend.length > 1 ? 25 + Math.round((index / (trend.length - 1)) * 425) : 225;
      const y = Math.round(140 - ((net - minNet) / range) * 102);
      const value = net >= 100000 ? `₹${(net / 100000).toFixed(1)}L` : net >= 1000 ? `₹${(net / 1000).toFixed(0)}K` : `₹${net}`;
      return {
        month: t.label || t.key,
        value,
        x,
        y,
      };
    });
  }, [data?.payrollTrend]);

  const svgPolyline = payrollPoints.length ? payrollPoints.map((p) => `${p.x},${p.y}`).join(' ') : '25,140 450,140';
  const svgArea = payrollPoints.length ? `25,160 ${svgPolyline} 450,160` : '25,160 450,160';

  if (loading && !data) return <LoadingState label="Loading admin dashboard…" />;
  if (error && !data) return <ErrorState message={error} retry={refresh} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Organization overview, workforce, attendance and payroll insights.
          </p>
        </div>

        {/* Date Selector Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Calendar size={13} className="text-slate-500" />
            <span>Jan 13, 2026</span>
            <ChevronDown size={12} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* 2. Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Staff */}
        <div className="bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 12%, transparent)',
              color: 'var(--erp-primary, #2563eb)',
            }}
          >
            <Users size={19} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Total Staff</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
              {totalStaff}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <ArrowUpRight size={12} />
              <span>+5.2% from last month</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Staff */}
        <div className="bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] dark:bg-emerald-950/60 text-[#10b981] flex items-center justify-center shrink-0">
            <UserCheck size={19} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Active Staff</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
              {activeStaff}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <ArrowUpRight size={12} />
              <span>+4.8% from last month</span>
            </div>
          </div>
        </div>

        {/* Card 3: Present Today */}
        <div className="bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f5f3ff] dark:bg-purple-950/60 text-[#7c3aed] flex items-center justify-center shrink-0">
            <CalendarCheck size={19} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Present Today</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
              {presentToday}
            </div>
            <span
              className="text-[11px] font-semibold block"
              style={{ color: 'var(--erp-primary, #2563eb)' }}
            >
              86.6% attendance rate
            </span>
          </div>
        </div>

        {/* Card 4: Monthly Payroll Disbursement */}
        <div className="bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fffbeb] dark:bg-amber-950/60 text-[#d97706] flex items-center justify-center shrink-0">
            <CreditCard size={19} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block truncate">
              Monthly Payroll
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
              ₹{payrollAmount.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <ArrowUpRight size={12} />
              <span>+3.1% from last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Row: Attendance Overview (7 cols) & Department Breakdown (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* Attendance Overview Card */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111827] rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header: Title + Period Pills */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Attendance Overview</h2>
              <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setAttendancePeriod('week')}
                  className="px-3 py-1 rounded-md font-semibold transition-all cursor-pointer text-xs"
                  style={attendancePeriod === 'week' ? { backgroundColor: 'var(--erp-primary, #2563eb)', color: '#ffffff' } : {}}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => setAttendancePeriod('month')}
                  className="px-3 py-1 rounded-md font-semibold transition-all cursor-pointer text-xs"
                  style={attendancePeriod === 'month' ? { backgroundColor: 'var(--erp-primary, #2563eb)', color: '#ffffff' } : {}}
                >
                  This Month
                </button>
              </div>
            </div>

            {/* Split: Chart (Left) + 4 Stat Tiles (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Left Column: Bar Chart */}
              <div className="md:col-span-8 flex flex-col justify-between">
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 mb-2 ml-8">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }} />
                    <span>Present</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b]" />
                    <span>Late</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#ef4444]" />
                    <span>Absent</span>
                  </div>
                </div>

                {/* Y-Axis Gridlines + 7 Day Bar Columns */}
                <div className="relative h-40 flex items-end">
                  {/* Horizontal Gridlines & Values */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-right">250</span>
                      <div className="flex-1 border-b border-slate-100 dark:border-slate-800" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-right">200</span>
                      <div className="flex-1 border-b border-slate-100 dark:border-slate-800" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-right">150</span>
                      <div className="flex-1 border-b border-slate-100 dark:border-slate-800" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-right">100</span>
                      <div className="flex-1 border-b border-slate-100 dark:border-slate-800" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-right">50</span>
                      <div className="flex-1 border-b border-slate-100 dark:border-slate-800" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-right">0</span>
                      <div className="flex-1 border-b border-slate-200 dark:border-slate-700" />
                    </div>
                  </div>

                  {/* Day Columns */}
                  <div className="relative z-10 w-full pl-8 pr-1 flex items-end justify-between h-32">
                    {attendanceDays.map((item) => (
                      <div key={item.day} className="flex flex-col items-center gap-1 flex-1">
                        <div className="flex items-end gap-0.5 h-28">
                          {/* Present Bar (Theme Primary) */}
                          <div
                            style={{
                              height: `${(item.present / 250) * 100}%`,
                              backgroundColor: 'var(--erp-primary, #2563eb)',
                            }}
                            className="w-2.5 sm:w-3 rounded-t-[3px] transition-all duration-500"
                            title={`Present: ${item.present}`}
                          />
                          {/* Late Bar (Amber) */}
                          <div
                            style={{ height: `${(item.late / 250) * 100}%` }}
                            className="w-2 bg-[#f59e0b] rounded-t-[2px] transition-all duration-500"
                            title={`Late: ${item.late}`}
                          />
                          {/* Absent Bar (Red) */}
                          <div
                            style={{ height: `${(item.absent / 250) * 100}%` }}
                            className="w-2 bg-[#ef4444] rounded-t-[2px] transition-all duration-500"
                            title={`Absent: ${item.absent}`}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                          {item.day}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: 4 Rounded Stat Tiles */}
              <div className="md:col-span-4 space-y-2">
                {/* 1. Present */}
                <div className="bg-[#ecfdf5] dark:bg-emerald-950/40 border border-[#d1fae5] dark:border-emerald-900/40 rounded-lg p-2.5 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-emerald-100/60 text-[#10b981] flex items-center justify-center shrink-0">
                    <User size={15} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Present</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white block leading-tight">214</strong>
                  </div>
                </div>

                {/* 2. Late */}
                <div className="bg-[#fffbeb] dark:bg-amber-950/40 border border-[#fef3c7] dark:border-amber-900/40 rounded-lg p-2.5 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-amber-100/60 text-[#f59e0b] flex items-center justify-center shrink-0">
                    <Clock size={15} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Late</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white block leading-tight">24</strong>
                  </div>
                </div>

                {/* 3. Absent */}
                <div className="bg-[#fef2f2] dark:bg-rose-950/40 border border-[#fee2e2] dark:border-rose-900/40 rounded-lg p-2.5 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-rose-100/60 text-[#ef4444] flex items-center justify-center shrink-0">
                    <UserX size={15} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Absent</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white block leading-tight">{kpis.absentToday ?? 0}</strong>
                  </div>
                </div>

                {/* 4. Attendance Rate */}
                <div
                  className="rounded-lg p-2.5 flex items-center gap-2.5 border"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 8%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 20%, transparent)',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 18%, transparent)',
                      color: 'var(--erp-primary, #2563eb)',
                    }}
                  >
                    <Timer size={15} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Attendance Rate</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white block leading-tight">
                      {activeStaff > 0 ? Math.round((presentToday / activeStaff) * 100) : 0}%
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Department Breakdown Card */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111827] rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Department Breakdown</h2>
              <span className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
                Total: {totalStaff}
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {departments.length ? (
                departments.map((dept) => (
                  <div key={dept.name} className="flex items-center justify-between text-xs">
                    <span className="w-20 font-medium text-slate-700 dark:text-slate-300 truncate">{dept.name}</span>
                    <div className="flex-1 mx-2.5 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{
                          width: `${dept.percentage}%`,
                          backgroundColor: 'var(--erp-primary, #2563eb)',
                        }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                    <span className="w-16 text-right font-bold text-slate-800 dark:text-slate-200">
                      {dept.count} <span className="font-medium text-slate-400">({dept.percentage}%)</span>
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center py-6 text-xs text-slate-400">No department data available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row: Payroll Trends (4 cols) + Pending Leaves (5 cols) + Recruitment Pipeline (3 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* Card 1: Payroll Trends (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111827] rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Payroll Trends</h2>
              <button
                type="button"
                onClick={() => setPayrollPeriod((p) => (p === '6months' ? 'year' : '6months'))}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer"
              >
                <span>{payrollPeriod === '6months' ? 'Last 6 Months' : 'Last 12 Months'}</span>
                <ChevronDown size={12} className="text-slate-400" />
              </button>
            </div>

            {/* SVG Line Chart with Gradient */}
            <div className="relative pt-1">
              {/* Y-axis labels */}
              <div className="flex">
                <div className="w-10 text-[10px] text-slate-400 font-medium flex flex-col justify-between h-36 pb-3">
                  <span>₹550K</span>
                  <span>₹525K</span>
                  <span>₹500K</span>
                  <span>₹475K</span>
                  <span>₹450K</span>
                  <span>₹425K</span>
                  <span>₹400K</span>
                </div>

                <div className="flex-1 relative h-36">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 480 160">
                    <defs>
                      <linearGradient id="payroll-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--erp-primary, #2563eb)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--erp-primary, #2563eb)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gradient area underneath */}
                    <polygon points={svgArea} fill="url(#payroll-gradient)" />

                    {/* Smooth vibrant line */}
                    <polyline
                      points={svgPolyline}
                      fill="none"
                      stroke="var(--erp-primary, #2563eb)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Dots on each month */}
                    {payrollPoints.map((pt) => (
                      <g key={pt.month}>
                        <circle cx={pt.x} cy={pt.y} r="4.5" fill="#ffffff" stroke="var(--erp-primary, #2563eb)" strokeWidth="2.5" />
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* X-axis Month Labels */}
              <div className="flex justify-between pl-10 pr-2 text-[11px] text-slate-500 font-medium -mt-1">
                {payrollPoints.map((pt) => (
                  <span key={pt.month}>{pt.month}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Pending Leave Approvals (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111827] rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-2.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Pending Leave Approvals</h2>
              <button
                type="button"
                onClick={() => navigate('/manage-leaves')}
                className="text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                style={{ color: 'var(--erp-primary, #2563eb)' }}
              >
                <span>View All</span>
                <span>→</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-1.5 font-bold">EMPLOYEE</th>
                    <th className="pb-1.5 font-bold">LEAVE TYPE</th>
                    <th className="pb-1.5 font-bold">FROM</th>
                    <th className="pb-1.5 font-bold">TO</th>
                    <th className="pb-1.5 font-bold text-center">DAYS</th>
                    <th className="pb-1.5 font-bold text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendingLeaves.length ? (
                    pendingLeaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {leave.avatar ? (
                              <img
                                src={leave.avatar}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {leave.name?.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                              {leave.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 text-slate-600 dark:text-slate-300">{leave.leaveType}</td>
                        <td className="py-2 text-slate-500 whitespace-nowrap">{leave.from}</td>
                        <td className="py-2 text-slate-500 whitespace-nowrap">{leave.to}</td>
                        <td className="py-2 font-bold text-slate-800 dark:text-slate-200 text-center">{leave.days}</td>
                        <td className="py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleLeaveDecision(leave.id, 'Approved')}
                              className="w-5.5 h-5.5 rounded-md bg-[#ecfdf5] hover:bg-emerald-100 text-[#10b981] flex items-center justify-center transition-colors cursor-pointer"
                              title="Approve"
                            >
                              <Check size={12} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLeaveDecision(leave.id, 'Rejected')}
                              className="w-5.5 h-5.5 rounded-md bg-[#fef2f2] hover:bg-rose-100 text-[#ef4444] flex items-center justify-center transition-colors cursor-pointer"
                              title="Reject"
                            >
                              <X size={12} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-400 text-xs">
                        No pending leave approvals
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Card 3: Recruitment Pipeline (3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-[#111827] rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Recruitment Pipeline</h2>
            </div>

            {/* 4 Vertical Metric Boxes */}
            <div className="grid grid-cols-4 gap-1.5 pt-0.5 text-center">
              {/* Applied */}
              <div
                className="rounded-lg p-2 flex flex-col items-center justify-center"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 10%, transparent)',
                }}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center mb-1"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 18%, transparent)',
                    color: 'var(--erp-primary, #2563eb)',
                  }}
                >
                  <User size={13} />
                </div>
                <strong className="text-base font-bold text-slate-900 dark:text-white leading-tight">{rec.applied || 0}</strong>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">Applied</span>
              </div>

              {/* Shortlisted */}
              <div className="bg-[#fffbeb] dark:bg-amber-950/40 rounded-lg p-2 flex flex-col items-center justify-center">
                <div className="w-6 h-6 rounded-md bg-amber-100/60 text-[#f59e0b] flex items-center justify-center mb-1">
                  <UserCheck size={13} />
                </div>
                <strong className="text-base font-bold text-slate-900 dark:text-white leading-tight">{rec.shortlisted || 0}</strong>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">Shortlisted</span>
              </div>

              {/* Interviewed */}
              <div className="bg-[#f5f3ff] dark:bg-purple-950/40 rounded-lg p-2 flex flex-col items-center justify-center">
                <div className="w-6 h-6 rounded-md bg-purple-100/60 text-[#7c3aed] flex items-center justify-center mb-1">
                  <Briefcase size={13} />
                </div>
                <strong className="text-base font-bold text-slate-900 dark:text-white leading-tight">{rec.interviewed || 0}</strong>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">Interview</span>
              </div>

              {/* Hired */}
              <div className="bg-[#ecfdf5] dark:bg-emerald-950/40 rounded-lg p-2 flex flex-col items-center justify-center">
                <div className="w-6 h-6 rounded-md bg-emerald-100/60 text-[#10b981] flex items-center justify-center mb-1">
                  <UserPlus size={13} />
                </div>
                <strong className="text-base font-bold text-slate-900 dark:text-white leading-tight">{rec.hired || 0}</strong>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">Hired</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
