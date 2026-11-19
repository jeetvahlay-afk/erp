import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  LockKeyhole,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import api, { asArray, getApiError } from '../lib/api';
import {
  Avatar,
  ErrorState,
  formatDate,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  StatusBadge,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';
import { monthCalendar } from '../utils/workReportCalendar';

const currentMonth = () => new Date().toLocaleDateString('en-CA').slice(0, 7);

const WorkReportDetails = () => {
  const { userId } = useParams();
  const [employee, setEmployee] = useState(null);
  const [reports, setReports] = useState([]);
  const [month, setMonth] = useState(currentMonth());
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/api/users/${userId}`),
      api.get(`/api/work-reports?userId=${userId}`),
    ])
      .then(([userResponse, reportsResponse]) => {
        setEmployee(userResponse.data);
        setReports(asArray(reportsResponse.data));
      })
      .catch((e) => setError(getApiError(e, 'Unable to load employee work reports')))
      .finally(() => setLoading(false));
  }, [userId]);

  const monthReports = useMemo(
    () => reports.filter((report) => String(report.date).slice(0, 7) === month),
    [month, reports]
  );
  const reportsByDate = new Map(
    monthReports.map((report) => [String(report.date).slice(0, 10), report])
  );
  const [year, monthNumber] = month.split('-').map(Number);
  const calendar = monthCalendar(new Date(year, monthNumber - 1, 1));

  if (loading) return <LoadingState label="Loading employee report calendar…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header */}
      <PageHeader
        title={`${employee?.name || 'Employee'} · Work Reports`}
        breadcrumbs={['HR Management', 'Work Reports', employee?.name || 'Details']}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Month:</span>
            <input
              type="month"
              value={month}
              max={currentMonth()}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-white border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
            />
          </div>
        }
      />

      {/* 2. Employee Profile & KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5">
        {/* Employee Summary Card */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex items-center gap-3.5">
          <Avatar user={employee} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900 truncate">
              {employee?.name}
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {employee?.employeeId || '—'} · {employee?.designation || 'Staff'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge>{employee?.department || 'Unassigned'}</StatusBadge>
              <span className="text-[11px] text-slate-400 font-medium">
                {employee?.email}
              </span>
            </div>
          </div>
        </div>

        {/* 2 KPIs */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
          <MetricCard
            label="Month Submissions"
            value={monthReports.length}
            helper="Reports logged this selected month"
            icon={CalendarCheck}
            tone="blue"
          />
          <MetricCard
            label="Total Logged History"
            value={reports.length}
            helper="All-time recorded reports"
            icon={CalendarDays}
            tone="green"
          />
        </div>
      </div>

      {/* 3. Monthly Calendar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {new Date(year, monthNumber - 1).toLocaleString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>
              <p className="text-xs text-slate-500">
                Click any submitted day to inspect employee accomplishments and deliverables.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Submitted</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>No Report</span>
            </span>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 text-center py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[360px]">
          {calendar.map((day, index) => {
            if (!day) return <div key={`blank-${index}`} className="bg-slate-50/30 p-2" />;
            const report = reportsByDate.get(day.key);

            return (
              <button
                type="button"
                key={day.key}
                disabled={!report}
                onClick={() => setSelected(report)}
                className={`p-3 text-left transition-all flex flex-col justify-between min-h-[90px] ${
                  report
                    ? 'bg-emerald-50/30 hover:bg-emerald-50/60 cursor-pointer'
                    : 'bg-slate-50/40 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      report ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500'
                    }`}
                  >
                    {day.day}
                  </span>
                  {report ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ) : (
                    <LockKeyhole size={12} className="text-slate-300" />
                  )}
                </div>

                <div className="mt-2 min-h-[28px] overflow-hidden">
                  {report ? (
                    <div className="text-[11px] text-emerald-800 line-clamp-2 font-medium">
                      {report.accomplishments}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400">No report</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Details Modal */}
      <Modal
        open={Boolean(selected)}
        title="Employee Work Notes"
        subtitle={
          selected
            ? `${employee?.name} · ${formatDate(selected.date)} · View only`
            : ''
        }
        onClose={() => setSelected(null)}
        footer={<ToolbarButton onClick={() => setSelected(null)}>Close</ToolbarButton>}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reported Accomplishments & Tasks
            </label>
            <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap min-h-[160px]">
              {selected?.accomplishments || 'No notes provided.'}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkReportDetails;
