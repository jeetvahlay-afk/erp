import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  ListTodo,
  LockKeyhole,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import api, { asArray, getApiError } from '../lib/api';
import {
  Avatar,
  EmptyState,
  ErrorState,
  formatDate,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';
import { monthCalendar } from '../utils/workReportCalendar';

const currentMonth = () => new Date().toLocaleDateString('en-CA').slice(0, 7);

const priorityTone = (priority) => {
  if (priority === 'high') return 'red';
  if (priority === 'medium') return 'amber';
  return 'slate';
};

const statusTone = (status) => {
  if (status === 'completed') return 'green';
  if (status === 'in progress') return 'blue';
  return 'amber';
};

const WorkReportDetails = () => {
  const { userId } = useParams();
  const [employee, setEmployee] = useState(null);
  const [reports, setReports] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [month, setMonth] = useState(currentMonth());
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/api/users/${userId}`),
      api.get(`/api/work-reports?userId=${userId}`),
      api.get(`/api/tasks?userId=${userId}`),
    ])
      .then(([userResponse, reportsResponse, tasksResponse]) => {
        setEmployee(userResponse.data);
        setReports(asArray(reportsResponse.data));
        setTasks(asArray(tasksResponse.data));
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

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'completed'),
    [tasks]
  );

  const selectedDateTasks = useMemo(() => {
    if (!selected?.date) return [];
    const dateStr = String(selected.date).slice(0, 10);
    return tasks.filter((t) => {
      const dueStr = t.dueDate ? String(t.dueDate).slice(0, 10) : '';
      const compStr = t.completedAt ? String(t.completedAt).slice(0, 10) : '';
      return dueStr === dateStr || compStr === dateStr;
    });
  }, [selected, tasks]);

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
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex items-center gap-3.5">
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
              <span className="text-[11px] text-slate-400 font-medium truncate">
                {employee?.email}
              </span>
            </div>
          </div>
        </div>

        {/* 4 KPIs */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
          <MetricCard
            label="Month Reports"
            value={monthReports.length}
            helper="Submitted this month"
            icon={CalendarCheck}
            tone="blue"
          />
          <MetricCard
            label="Total Reports"
            value={reports.length}
            helper="All-time history"
            icon={CalendarDays}
            tone="purple"
          />
          <MetricCard
            label="Daily Tasks"
            value={tasks.length}
            helper="Assigned daily tasks"
            icon={ListTodo}
            tone="amber"
          />
          <MetricCard
            label="Completed Tasks"
            value={completedTasks.length}
            helper={`${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}% completion`}
            icon={CheckCircle2}
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
                Click any submitted day to inspect employee accomplishments, deliverables, and tasks.
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

      {/* 4. Employee's Assigned Daily Tasks Section */}
      <TableShell
        title={`Assigned Daily Tasks (${tasks.length})`}
        subtitle={`Current and scheduled daily deliverables for ${employee?.name || 'this employee'}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Task Title & Description</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Completed On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState
                      title="No daily tasks assigned"
                      description="No active or past daily tasks have been assigned to this employee."
                    />
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{task.title}</p>
                      {task.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge tone={priorityTone(task.priority)}>
                        {task.priority || 'medium'}
                      </StatusBadge>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge tone={statusTone(task.status)}>
                        {task.status || 'pending'}
                      </StatusBadge>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {task.dueDate ? formatDate(task.dueDate) : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {task.completedAt ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 size={13} />
                          {formatDate(task.completedAt)}
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TableShell>

      {/* 5. Details Modal */}
      <Modal
        open={Boolean(selected)}
        title="Employee Work Report & Daily Tasks"
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
              Reported Accomplishments
            </label>
            <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
              {selected?.accomplishments || 'No accomplishments notes provided.'}
            </div>
          </div>

          {selected?.blockers && (
            <div>
              <label className="block text-xs font-semibold text-rose-700 mb-1.5">
                Blockers & Challenges
              </label>
              <div className="w-full bg-rose-50/50 border border-rose-200/80 rounded-xl p-3 text-xs text-rose-900 leading-relaxed whitespace-pre-wrap">
                {selected.blockers}
              </div>
            </div>
          )}

          {selected?.nextPlan && (
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1.5">
                Plan for Next Day
              </label>
              <div className="w-full bg-blue-50/50 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">
                {selected.nextPlan}
              </div>
            </div>
          )}

          {/* Daily tasks on this date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Assigned Tasks on this Date ({selectedDateTasks.length})
            </label>
            {selectedDateTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                No specific daily tasks were scheduled or completed on this date.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDateTasks.map((t) => (
                  <div
                    key={t._id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{t.title}</p>
                      {t.description && (
                        <p className="text-[11px] text-slate-500 truncate">{t.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge tone={priorityTone(t.priority)}>{t.priority}</StatusBadge>
                      <StatusBadge tone={statusTone(t.status)}>{t.status}</StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkReportDetails;
