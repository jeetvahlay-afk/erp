import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  LockKeyhole,
  Plus,
  Sparkles,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  ErrorState,
  formatDate,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';
import { monthCalendar } from '../utils/workReportCalendar';

const today = () => new Date().toLocaleDateString('en-CA');
const emptyReport = () => ({
  date: today(),
  hoursWorked: 8,
  completion: 100,
  accomplishments: '',
  blockers: '',
  nextPlan: '',
});

const MyWorkReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const calendar = monthCalendar();
  const reportsByDate = new Map(
    reports.map((report) => [String(report.date).slice(0, 10), report])
  );
  const readOnly = Boolean(form?.date && form.date !== today());

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/work-reports/me');
      setReports(asArray(data));
      setError('');
    } catch (e) {
      setError(getApiError(e, 'Unable to load work reports'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openDay = (day) => {
    if (!day || day.future) return;
    const report = reportsByDate.get(day.key);
    if (report) setForm({ ...report, date: day.key });
    else if (day.key === today()) setForm({ ...emptyReport(), date: day.key });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/api/work-reports/me', form);
      feedback.success('Daily work report saved.');
      setForm(null);
      load();
    } catch (e) {
      feedback.error(getApiError(e, 'Unable to save work report'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading your work reports…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  const currentMonthReports = reports.filter(
    (r) => String(r.date).slice(0, 7) === today().slice(0, 7)
  );
  const todayReport = reportsByDate.get(today());

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="My Work Report"
        breadcrumbs={['Self Service', 'My Work Report']}
        actions={
          <ToolbarButton
            primary
            icon={Plus}
            onClick={() => setForm(todayReport || emptyReport())}
          >
            {todayReport ? 'Edit Today’s Report' : 'Add Today’s Report'}
          </ToolbarButton>
        }
      />

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard
          label="This Month Reports"
          value={currentMonthReports.length}
          helper="Reports logged this month"
          icon={CalendarCheck}
          tone="blue"
        />
        <MetricCard
          label="Today's Status"
          value={todayReport ? 'Submitted' : 'Pending'}
          helper={todayReport ? 'Work notes recorded' : 'Due by end of day'}
          icon={todayReport ? CheckCircle2 : Clock}
          tone={todayReport ? 'green' : 'amber'}
        />
        <MetricCard
          label="All-Time Submitted"
          value={reports.length}
          helper="Total recorded daily entries"
          icon={CalendarDays}
          tone="purple"
        />
        <MetricCard
          label="Submission Rate"
          value={currentMonthReports.length ? 'Good' : 'Needs Entry'}
          helper="Monthly reporting consistency"
          icon={Sparkles}
          tone="teal"
        />
      </div>

      {/* 3. Calendar Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-xs text-slate-500">
                Click on today to submit notes. Past dates are view-only.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Submitted</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Today</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>Locked</span>
            </span>
          </div>
        </div>

        {/* Days of week header */}
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
            const isToday = day.key === today();
            const locked = !isToday && !report;

            return (
              <button
                type="button"
                key={day.key}
                disabled={day.future || (locked && !report)}
                onClick={() => openDay(day)}
                className={`p-3 text-left transition-all flex flex-col justify-between min-h-[90px] cursor-pointer group ${
                  report
                    ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                    : isToday
                    ? 'bg-blue-50/40 hover:bg-blue-50/70 ring-1 ring-inset ring-blue-500/20'
                    : locked || day.future
                    ? 'bg-slate-50/40 opacity-60 cursor-not-allowed'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : report
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'text-slate-700'
                    }`}
                  >
                    {day.day}
                  </span>
                  {report ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ) : locked || day.future ? (
                    <LockKeyhole size={12} className="text-slate-300" />
                  ) : null}
                </div>

                <div className="mt-2 min-h-[28px] overflow-hidden">
                  {report ? (
                    <div className="text-[11px] text-emerald-800 line-clamp-2 font-medium">
                      {report.accomplishments}
                    </div>
                  ) : isToday ? (
                    <span className="text-[10px] text-blue-600 font-semibold group-hover:underline">
                      + Add notes
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Notes Modal */}
      <Modal
        open={Boolean(form)}
        title={readOnly ? 'Work Report Notes' : 'Today’s Work Notes'}
        subtitle={
          form?.date
            ? `${formatDate(`${form.date}T00:00:00`)}${readOnly ? ' · View only' : ''}`
            : ''
        }
        onClose={() => setForm(null)}
        footer={
          readOnly ? (
            <ToolbarButton onClick={() => setForm(null)}>Close</ToolbarButton>
          ) : (
            <>
              <ToolbarButton onClick={() => setForm(null)}>Cancel</ToolbarButton>
              <ToolbarButton
                primary
                disabled={
                  saving ||
                  (form?.accomplishments?.trim().length || 0) < 3 ||
                  !/[\p{L}\p{N}]/u.test(form?.accomplishments || '')
                }
                onClick={save}
              >
                {saving ? 'Saving…' : 'Save Notes'}
              </ToolbarButton>
            </>
          )
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Work Completed / Accomplishments
            </label>
            <textarea
              rows={8}
              minLength={3}
              readOnly={readOnly}
              value={form?.accomplishments || ''}
              onChange={(e) => setForm({ ...form, accomplishments: e.target.value })}
              placeholder="Detail what you worked on, milestones achieved, or deliverables completed..."
              autoFocus={!readOnly}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 leading-relaxed font-normal"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Minimum 3 characters required.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyWorkReport;
