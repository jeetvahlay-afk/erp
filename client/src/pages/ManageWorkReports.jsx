import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  ChevronRight,
  FileCheck2,
  FileText,
  UserCheck,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const [usersResponse, reportsResponse] = await Promise.all([
        api.get('/api/users?limit=500'),
        api.get('/api/work-reports'),
      ]);
      setEmployees(asArray(usersResponse.data));
      setReports(asArray(reportsResponse.data));
    } catch (e) {
      setError(getApiError(e, 'Unable to load employees and work reports'));
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
        return { employee, reports: employeeReports, latest: employeeReports[0] };
      });
  }, [employees, reports, search]);

  if (loading) return <LoadingState label="Loading employee work reports…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  const totalReportsCount = reports.length;
  const reportingEmployeesCount = new Set(
    reports.map((r) => String(r.user?._id || r.user))
  ).size;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="Work Report Management"
        breadcrumbs={['HR Management', 'Work Reports']}
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
          label="Reporting Staff"
          value={formatNumber(reportingEmployeesCount)}
          helper="Submitted at least 1 report"
          icon={UserCheck}
          tone="teal"
        />
        <MetricCard
          label="Pending Submission"
          value={formatNumber(Math.max(0, employees.length - reportingEmployeesCount))}
          helper="No reports recorded yet"
          icon={FileText}
          tone="amber"
        />
      </div>

      {/* 3. TableShell */}
      <TableShell
        title="Employee Work Reports"
        summary="Select an employee to view their monthly calendar breakdown and task logs."
        toolbar={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search employee or department..."
          />
        }
        footer={<span>Showing {rows.length} employee records</span>}
      >
        {rows.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">EMPLOYEE</th>
                <th className="py-2.5 px-2.5">DEPARTMENT</th>
                <th className="py-2.5 px-2.5">TOTAL REPORTS</th>
                <th className="py-2.5 px-2.5">LATEST REPORT</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rows.map(({ employee, reports: employeeReports, latest }) => (
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
        )}
      </TableShell>
    </div>
  );
};

export default ManageWorkReports;