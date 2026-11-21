import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  ListTodo,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { asArray, getApiError } from '../lib/api';
import {
  Avatar,
  EmptyState,
  ErrorState,
  formatDate,
  formatNumber,
  LoadingState,
  MetricCard,
  PageHeader,
  SearchInput,
  StatusBadge,
  TableShell,
} from '../components/ui/EnterpriseUI';

const ManageWorkReports = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [reports, setReports] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState('overview'); // 'overview' | 'tasks'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const [usersResponse, reportsResponse, tasksResponse] = await Promise.all([
        api.get('/api/users?limit=500'),
        api.get('/api/work-reports'),
        api.get('/api/tasks?scope=all'),
      ]);
      setEmployees(asArray(usersResponse.data));
      setReports(asArray(reportsResponse.data));
      setTasks(asArray(tasksResponse.data));
    } catch (e) {
      setError(getApiError(e, 'Unable to load employees, work reports, and tasks'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    return employees
      .filter((employee) =>
        `${employee.name} ${employee.employeeId || ''} ${employee.department || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .map((employee) => {
        const employeeReports = reports.filter(
          (report) => String(report.user?._id || report.user) === String(employee._id)
        );
        const employeeTasks = tasks.filter(
          (task) => String(task.assignee?._id || task.assignee) === String(employee._id)
        );
        const completedTasks = employeeTasks.filter((t) => t.status === 'completed');
        return {
          employee,
          reports: employeeReports,
          latest: employeeReports[0],
          tasks: employeeTasks,
          completedTasks,
        };
      });
  }, [employees, reports, tasks, search]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const title = String(task.title || '').toLowerCase();
      const assigneeName = String(task.assignee?.name || '').toLowerCase();
      const desc = String(task.description || '').toLowerCase();
      return !query || title.includes(query) || assigneeName.includes(query) || desc.includes(query);
    });
  }, [tasks, search]);

  if (loading) return <LoadingState label="Loading employee work reports & daily tasks…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  const totalReportsCount = reports.length;
  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="Work Report Management"
        breadcrumbs={['HR Management', 'Work Reports & Tasks']}
      />

      {/* 2. Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard
          label="Total Employees"
          value={formatNumber(employees.length)}
          helper="Tracked team members"
          icon={Users}
          tone="blue"
        />
        <MetricCard
          label="Total Logged Reports"
          value={formatNumber(totalReportsCount)}
          helper="All submitted entries"
          icon={FileCheck2}
          tone="green"
        />
        <MetricCard
          label="Assigned Daily Tasks"
          value={formatNumber(tasks.length)}
          helper="Company-wide active tasks"
          icon={ListTodo}
          tone="teal"
        />
        <MetricCard
          label="Completed Daily Tasks"
          value={formatNumber(completedTasksCount)}
          helper={`${tasks.length ? Math.round((completedTasksCount / tasks.length) * 100) : 0}% completion rate`}
          icon={CheckCircle2}
          tone="purple"
        />
      </div>

      {/* 3. TableShell with Tabs */}
      <TableShell
        title={tab === 'overview' ? 'Employee Work Reports & Tasks' : 'All Employee Daily Tasks Feed'}
        summary={
          tab === 'overview'
            ? 'Select an employee to view their monthly calendar breakdown, reported hours, and assigned daily tasks.'
            : 'Live stream of daily tasks assigned across team members with priority and completion statuses.'
        }
        toolbar={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={tab === 'overview' ? 'Search employee or department...' : 'Search task or assignee...'}
            />
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center text-xs shrink-0">
              <button
                type="button"
                onClick={() => setTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  tab === 'overview'
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Employees Overview
              </button>
              <button
                type="button"
                onClick={() => setTab('tasks')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  tab === 'tasks'
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Daily Tasks ({tasks.length})
              </button>
            </div>
          </div>
        }
        footer={
          <span>
            {tab === 'overview'
              ? `Showing ${rows.length} employee records`
              : `Showing ${filteredTasks.length} daily task items`}
          </span>
        }
      >
        {tab === 'overview' ? (
          rows.length ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">EMPLOYEE</th>
                  <th className="py-2.5 px-2.5">DEPARTMENT</th>
                  <th className="py-2.5 px-2.5">DAILY TASKS</th>
                  <th className="py-2.5 px-2.5">TOTAL REPORTS</th>
                  <th className="py-2.5 px-2.5">LATEST REPORT</th>
                  <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rows.map(({ employee, reports: employeeReports, latest, tasks: empTasks, completedTasks }) => (
                  <tr
                    key={employee._id}
                    onClick={() => navigate(`/work-reports/${employee._id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar user={employee} size="sm" />
                        <div>
                          <strong className="block text-slate-900 font-bold group-hover:text-blue-600 transition-colors leading-tight">
                            {employee.name}
                          </strong>
                          <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">
                            {employee.employeeId || '—'} · {employee.designation || 'Staff'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 font-medium text-slate-700">
                      <StatusBadge>{employee.department || 'General'}</StatusBadge>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {completedTasks.length} / {empTasks.length} Done
                        </span>
                        {empTasks.length > 0 && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              completedTasks.length === empTasks.length
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {Math.round((completedTasks.length / empTasks.length) * 100)}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 font-semibold text-slate-800">
                      {employeeReports.length}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600">
                      {latest ? (
                        <div className="flex items-center gap-1.5">
                          <CalendarCheck size={13} className="text-slate-400" />
                          <span>{formatDate(latest.date)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">No reports yet</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right text-slate-400 group-hover:text-blue-600 transition-colors">
                      <ChevronRight size={16} className="inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="No employees found"
              message="No employees match your search query."
            />
          )
        ) : (
          filteredTasks.length ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">TASK TITLE</th>
                  <th className="py-2.5 px-2.5">ASSIGNEE</th>
                  <th className="py-2.5 px-2.5">PRIORITY</th>
                  <th className="py-2.5 px-2.5">STATUS</th>
                  <th className="py-2.5 px-2.5">DUE DATE</th>
                  <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTasks.map((task) => (
                  <tr key={task._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                      <div>
                        <strong className="block text-slate-900 font-bold leading-tight">
                          {task.title}
                        </strong>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar user={task.assignee} size="xs" />
                        <span className="font-medium text-slate-800">
                          {task.assignee?.name || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          task.priority === 'high'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : task.priority === 'low'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {task.priority || 'Medium'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <StatusBadge
                        tone={
                          task.status === 'completed'
                            ? 'success'
                            : task.status === 'in progress'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {task.status === 'completed'
                          ? 'Completed'
                          : task.status === 'in progress'
                          ? 'In Progress'
                          : 'Pending'}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600">
                      {task.dueDate ? (
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400" />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">No deadline</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                      {task.assignee?._id && (
                        <button
                          type="button"
                          onClick={() => navigate(`/work-reports/${task.assignee._id}`)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          View Reports
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="No daily tasks found"
              message="No tasks match the search filter."
            />
          )
        )}
      </TableShell>
    </div>
  );
};

export default ManageWorkReports;