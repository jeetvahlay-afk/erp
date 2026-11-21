import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Calendar,
  CalendarRange,
  Clock3,
  Download,
  RotateCcw,
  TimerReset,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { downloadCsv } from '../lib/export';
import {
  EmptyState,
  ErrorState,
  formatDate,
  formatTime,
  LoadingState,
  MetricCard,
  PageHeader,
  Pagination,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const localDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const currentMonthRange = () => {
  const today = new Date();
  return {
    from: localDateValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: localDateValue(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
};

const DEFAULT_MONTH_RANGE = currentMonthRange();

const EmployeeAttendance = () => {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState(DEFAULT_MONTH_RANGE.from);
  const [to, setTo] = useState(DEFAULT_MONTH_RANGE.to);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const { data } = await api.get(`/api/attendance/me?${params}`);
      setRows(asArray(data));
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load attendance history'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, status, from, to]);

  const summary = useMemo(
    () => ({
      hours: rows.reduce((total, row) => total + Number(row.totalHours || 0), 0),
      present: rows.filter((row) => row.status === 'Present').length,
      late: rows.filter((row) => row.status === 'Late').length,
      absent: rows.filter((row) => row.status === 'Absent').length,
    }),
    [rows]
  );

  const resetFilters = () => {
    setFrom(DEFAULT_MONTH_RANGE.from);
    setTo(DEFAULT_MONTH_RANGE.to);
    setStatus('');
    setPage(1);
  };

  if (loading && !rows.length) return <LoadingState label="Loading attendance records…" />;
  if (error && !rows.length) return <ErrorState message={error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="My Attendance"
        breadcrumbs={['Self Service', 'My Attendance']}
        actions={
          <ToolbarButton
            icon={Download}
            disabled={!rows.length}
            onClick={() => downloadCsv('my-attendance.csv', rows)}
          >
            Export CSV
          </ToolbarButton>
        }
      />

      {/* 2. Top 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <MetricCard
          label="Recorded Hours"
          value={`${summary.hours.toFixed(1)}h`}
          helper="Total logged work hours"
          icon={Clock3}
          tone="blue"
        />
        <MetricCard
          label="Present Days"
          value={summary.present}
          helper="On-time shift attendance"
          icon={BadgeCheck}
          tone="green"
        />
        <MetricCard
          label="Late Arrivals"
          value={summary.late}
          helper="Shift starts after grace"
          icon={TimerReset}
          tone="amber"
        />
        <MetricCard
          label="Absences"
          value={summary.absent}
          helper="Days without attendance"
          icon={CalendarRange}
          tone="red"
        />
      </div>

      {/* 3. TableShell with Date & Status Filters */}
      <TableShell
        title="Attendance Logs"
        summary={`${pagination.total || 0} attendance entries`}
        toolbar={
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">From:</span>
              <input
                className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">To:</span>
              <input
                className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none cursor-pointer"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option>Present</option>
              <option>Late</option>
              <option>Half Day</option>
              <option>Absent</option>
            </select>
            <button
              type="button"
              onClick={resetFilters}
              className="border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} className="text-slate-500 dark:text-slate-400" />
              <span>Reset</span>
            </button>
          </>
        }
        footer={
          <>
            <span>Showing {rows.length} of {pagination.total || 0} entries</span>
            <Pagination page={pagination.page || page} pages={pagination.pages || 1} onPage={setPage} />
          </>
        }
      >
        {rows.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">DATE</th>
                <th className="py-2.5 px-2.5">CHECK IN</th>
                <th className="py-2.5 px-2.5">CHECK OUT</th>
                <th className="py-2.5 px-2.5">HOURS</th>
                <th className="py-2.5 px-2.5">BREAK DURATION</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {rows.map((row) => (
                <tr key={row._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-2.5 pl-4 sm:pl-5 pr-2.5 font-semibold text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{formatDate(row.date || row.loginTime)}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-300">{formatTime(row.loginTime)}</td>
                  <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-300">{formatTime(row.logoutTime)}</td>
                  <td className="py-2.5 px-2.5 font-semibold text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{row.totalHours ? `${Number(row.totalHours).toFixed(2)}h` : '—'}</span>
                      {row.isLatePenalty && (
                        <span
                          className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-800"
                          title="3rd late check-in: 4.5 hours cut from working hours"
                        >
                          -4.5h cut
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-300">
                    {row.totalBreakDuration ? `${row.totalBreakDuration} mins` : '0 mins'}
                  </td>
                  <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                    {row.isLatePenalty ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Half Day (3rd Late)
                      </span>
                    ) : (
                      <StatusBadge tone={row.status === 'Late' ? 'warning' : undefined}>{row.status}</StatusBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No attendance records found"
            message="No records found for the selected date range."
          />
        )}
      </TableShell>
    </div>
  );
};

export default EmployeeAttendance;