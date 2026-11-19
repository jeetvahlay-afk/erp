import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CalendarDays,
  Download,
  IndianRupee,
  TimerReset,
  UserPlus,
  Users,
} from 'lucide-react';
import useLiveData from '../hooks/useLiveData';
import {
  Avatar,
  ColumnChart,
  EmptyState,
  ErrorState,
  formatCurrency,
  formatDate,
  formatNumber,
  formatTime,
  LoadingState,
  StatusBadge,
} from '../components/ui/EnterpriseUI';

const HRDashboard = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useLiveData('/api/dashboard/hr');

  const attendanceDays = useMemo(() => {
    return [
      { day: 'Mon', present: 214, late: 24, absent: 18 },
      { day: 'Tue', present: 220, late: 28, absent: 15 },
      { day: 'Wed', present: 210, late: 22, absent: 20 },
      { day: 'Thu', present: 208, late: 25, absent: 19 },
      { day: 'Fri', present: 190, late: 20, absent: 14 },
      { day: 'Sat', present: 195, late: 18, absent: 16 },
      { day: 'Sun', present: 218, late: 26, absent: 22 },
    ];
  }, []);

  if (loading) return <LoadingState label="Loading HR dashboard…" />;
  if (error) return <ErrorState message={error} retry={refresh} />;

  const kpis = data?.kpis || {};
  const totalEmployees = kpis.totalEmployees || 0;
  const activeEmployees = kpis.activeEmployees || 0;
  const inactiveEmployees = Math.max(0, totalEmployees - activeEmployees);
  const activePercent = totalEmployees ? Math.round((activeEmployees / totalEmployees) * 100) : 0;
  const rec = data?.recruitment || {};
  const recTotal = (rec.applied || 0) + (rec.shortlisted || 0) + (rec.interviewed || 0) + (rec.hired || 0);

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header / Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            HR Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Workforce analytics, recruitment pipeline, and employee attendance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
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
            <span>Yearly Report</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/add-employee')}
            className="inline-flex items-center gap-1.5 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
          >
            <UserPlus size={14} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Metric KPI Cards (MatDash Minimal Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Total Employees</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {formatNumber(kpis.totalEmployees)}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">
              {activePercent}% active workforce
            </span>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 12%, transparent)',
              color: 'var(--erp-primary, #2563eb)',
            }}
          >
            <Users size={19} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">New Joiners</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {formatNumber(kpis.newJoiners)}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Joined this month</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <UserPlus size={19} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Late Arrivals Today</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {formatNumber(kpis.lateToday)}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
              {kpis.attendanceRate || 0}% attendance rate
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <TimerReset size={19} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Monthly Payroll</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {formatCurrency(kpis.payrollCost)}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Current month net payroll</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <IndianRupee size={19} />
          </div>
        </div>
      </div>

      {/* 3. Middle Row: Attendance Trend (8 cols) + Workforce Status (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Attendance Trend (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Attendance Trend
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.2">
                {formatNumber(kpis.attendanceToday)} employee{kpis.attendanceToday === 1 ? '' : 's'} recorded today
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/manage-attendance')}
              className="text-xs font-semibold transition-colors cursor-pointer"
              style={{ color: 'var(--erp-primary, #2563eb)' }}
            >
              Manage
            </button>
          </div>

          <div className="pt-2">
            <ColumnChart
              data={attendanceDays}
              keys={['present', 'late', 'absent']}
              labels={{ present: 'Present', late: 'Late', absent: 'Absent' }}
              height={190}
            />
          </div>
        </div>

        {/* Workforce Status (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Workforce Status
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.2">Active vs Inactive ratio</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/manage-employee')}
              className="text-xs font-semibold transition-colors cursor-pointer"
              style={{ color: 'var(--erp-primary, #2563eb)' }}
            >
              View All
            </button>
          </div>

          {/* Active / Inactive horizontal split meter */}
          <div className="space-y-1.5">
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${activePercent}%`, backgroundColor: 'var(--erp-primary, #10b981)' }}
                className="h-full transition-all"
                title={`Active: ${activePercent}%`}
              />
              <div
                style={{ width: `${100 - activePercent}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`Inactive: ${100 - activePercent}%`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--erp-primary, #10b981)' }} />
                Active {activeEmployees}
              </span>
              <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Inactive {inactiveEmployees}
              </span>
            </div>
          </div>

          {/* Stat count cards */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <span className="text-[11px] text-slate-500 block">Total</span>
              <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5">{formatNumber(totalEmployees)}</strong>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <span className="text-[11px] text-slate-500 block">Active</span>
              <strong className="text-xs sm:text-sm font-bold block mt-0.5" style={{ color: 'var(--erp-primary, #10b981)' }}>{formatNumber(activeEmployees)}</strong>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <span className="text-[11px] text-slate-500 block">New</span>
              <strong className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 block mt-0.5">{formatNumber(kpis.newJoiners)}</strong>
            </div>
          </div>

          {/* Department mini-list */}
          <div className="pt-1">
            <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">By Department</h4>
            {data.departmentDistribution?.length ? (
              <div className="space-y-1.5">
                {data.departmentDistribution.slice(0, 4).map((d) => (
                  <div key={d._id} className="text-xs flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{d._id || 'Unassigned'}</span>
                    <div className="flex-1 mx-2.5 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (d.count / (totalEmployees || 1)) * 100)}%`,
                          backgroundColor: 'var(--erp-primary, #2563eb)',
                        }}
                      />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white text-xs">{d.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">No departments configured</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Row 3: Three Equal Panels (4 cols each) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
        {/* Panel 1: Late Arrivals Today */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-2.5">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Late Arrivals Today</h3>
                <p className="text-[11px] text-slate-500 mt-0.2">Arrivals after shift start</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/manage-attendance')}
                className="text-xs font-semibold transition-colors cursor-pointer"
                style={{ color: 'var(--erp-primary, #2563eb)' }}
              >
                Today
              </button>
            </div>

            {data.lateArrivals?.length ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {data.lateArrivals.map((row) => (
                  <div className="py-2 flex items-center justify-between gap-3" key={row._id}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar user={row.user} size="sm" />
                      <div className="min-w-0">
                        <strong className="text-slate-900 dark:text-white block truncate font-semibold text-xs">{row.user?.name}</strong>
                        <span className="text-[11px] text-slate-500 block truncate">{row.user?.department || 'Unassigned'}</span>
                      </div>
                    </div>
                    <time className="text-amber-600 font-semibold text-xs shrink-0">{formatTime(row.loginTime)}</time>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No late arrivals" message="Everyone arrived on time today." />
            )}
          </div>
        </div>

        {/* Panel 2: Recruitment Pipeline */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-2.5">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Recruitment Pipeline</h3>
                <p className="text-[11px] text-slate-500 mt-0.2">Applicant tracking summary</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/manage-interviews')}
                className="text-xs font-semibold transition-colors cursor-pointer"
                style={{ color: 'var(--erp-primary, #2563eb)' }}
              >
                Manage
              </button>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                {recTotal > 0 ? (
                  <>
                    {rec.applied > 0 && (
                      <div
                        style={{ flex: rec.applied, backgroundColor: 'var(--erp-primary, #2563eb)' }}
                        className="h-full"
                        title={`Applied: ${rec.applied}`}
                      />
                    )}
                    {rec.shortlisted > 0 && <div style={{ flex: rec.shortlisted }} className="bg-amber-500 h-full" title={`Shortlisted: ${rec.shortlisted}`} />}
                    {rec.interviewed > 0 && <div style={{ flex: rec.interviewed }} className="bg-indigo-500 h-full" title={`Interviewed: ${rec.interviewed}`} />}
                    {rec.hired > 0 && <div style={{ flex: rec.hired }} className="bg-emerald-500 h-full" title={`Hired: ${rec.hired}`} />}
                  </>
                ) : (
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-full" />
                )}
              </div>

              <div className="flex gap-1.5 flex-wrap text-[11px]">
                <span
                  className="px-2 py-0.5 rounded-md font-medium"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 12%, transparent)',
                    color: 'var(--erp-primary, #2563eb)',
                  }}
                >
                  Applied: {formatNumber(rec.applied)}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium">Shortlisted: {formatNumber(rec.shortlisted)}</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-medium">Interviewed: {formatNumber(rec.interviewed)}</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium">Hired: {formatNumber(rec.hired)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Applied</span>
                  <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5">{formatNumber(rec.applied)}</strong>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Interviewed</span>
                  <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5">{formatNumber(rec.interviewed)}</strong>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Hired</span>
                  <strong className="text-xs sm:text-sm font-bold text-emerald-600 block mt-0.5">{formatNumber(rec.hired)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: Upcoming Interviews */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-2.5">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Upcoming Interviews</h3>
                <p className="text-[11px] text-slate-500 mt-0.2">Scheduled candidate evaluations</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/manage-interviews')}
                className="text-xs font-semibold transition-colors cursor-pointer"
                style={{ color: 'var(--erp-primary, #2563eb)' }}
              >
                View All
              </button>
            </div>

            {data.upcomingInterviews?.length ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {data.upcomingInterviews.map((item) => (
                  <div className="py-2 flex items-center justify-between gap-3" key={item._id}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 12%, transparent)',
                          color: 'var(--erp-primary, #2563eb)',
                        }}
                      >
                        <CalendarDays size={14} />
                      </div>
                      <div className="min-w-0">
                        <strong className="text-slate-900 dark:text-white block truncate font-semibold text-xs">{item.candidateName}</strong>
                        <span className="text-[11px] text-slate-500 block truncate">{item.candidatePost || 'Candidate'}</span>
                      </div>
                    </div>
                    <time className="text-slate-600 dark:text-slate-400 font-semibold text-xs shrink-0">{formatDate(item.interviewDate)}</time>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No upcoming interviews" message="No interviews scheduled yet." />
            )}
          </div>
        </div>
      </div>

      {/* 5. Row 4: Pending Leave Approvals (Full Width) */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Pending Leave Approvals
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.2">
              Staff leave requests awaiting manager review
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/manage-leaves')}
            className="text-xs font-semibold transition-colors cursor-pointer"
            style={{ color: 'var(--erp-primary, #2563eb)' }}
          >
            Review All
          </button>
        </div>

        {data.pendingApprovals?.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {data.pendingApprovals.map((leave) => (
              <div className="py-2.5 flex items-center justify-between gap-3" key={leave._id}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar user={leave.user} size="sm" />
                  <div className="min-w-0">
                    <strong className="text-slate-900 dark:text-white block truncate font-semibold text-xs">{leave.user?.name}</strong>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {leave.leaveType} · {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                    </span>
                  </div>
                </div>
                <StatusBadge>{leave.status}</StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No pending approvals" message="All leave requests have been reviewed." />
        )}
      </div>
    </div>
  );
};

export default HRDashboard;
