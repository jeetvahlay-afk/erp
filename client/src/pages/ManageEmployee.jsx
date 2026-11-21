import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { downloadCsv } from '../lib/export';
import { feedback } from '../lib/feedback';
import { LoadingState, ErrorState } from '../components/ui/EnterpriseUI';

const ManageEmployee = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [designation, setDesignation] = useState('All Designations');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResponse, dashboardResponse] = await Promise.all([
        api.get('/api/users?limit=50'),
        api.get('/api/dashboard/admin'),
      ]);
      const apiUsers = asArray(usersResponse.data);
      const mappedApiUsers = apiUsers.map((u, i) => ({
        _id: u._id,
        employeeId: u.employeeId || `EMP${String(i + 1).padStart(3, '0')}`,
        name: u.name,
        email: u.email,
        avatar: u.profileImage
          ? u.profileImage.startsWith('http')
            ? u.profileImage
            : `/api/users/${u._id}/avatar`
          : '',
        department: u.department || 'General',
        designation: u.designation || u.role || 'Staff',
        joiningDate: u.joiningDate
          ? new Date(u.joiningDate).toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            })
          : '—',
        employmentType: u.employmentType || 'Full Time',
        status: (() => {
          if (u.employmentType === 'Probation' || u.probationStatus === 'In Probation') return 'Probation';
          if (u.isActive !== false) return 'Active';
          const sep = (u.separationType || u.exitReason || 'Inactive').trim();
          const lower = sep.toLowerCase();
          if (lower.includes('terminat')) return 'Terminated';
          if (lower.includes('absco')) return 'Absconded';
          if (lower.includes('resign')) return 'Resigned';
          if (lower.includes('retire')) return 'Retired';
          if (lower.includes('contract')) return 'Contract Ended';
          return sep || 'Inactive';
        })(),
        separationType: u.separationType || '',
        exitDate: u.exitDate || null,
        exitReason: u.exitReason || '',
        isActive: u.isActive !== false,
      }));

      setEmployees(mappedApiUsers);
      setStats(dashboardResponse.data?.kpis || {});
    } catch (requestError) {
      setEmployees([]);
      setError(getApiError(requestError, 'Unable to load employees'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetFilters = () => {
    setSearch('');
    setDepartment('All Departments');
    setDesignation('All Designations');
    setStatusFilter('All Status');
    setPage(1);
  };

  const uniqueDepartments = useMemo(() => {
    return [...new Set(employees.map((e) => e.department).filter(Boolean))].sort();
  }, [employees]);

  const uniqueDesignations = useMemo(() => {
    return [...new Set(employees.map((e) => e.designation).filter(Boolean))].sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        !search ||
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase());

      const matchesDept =
        department === 'All Departments' || emp.department === department;

      const matchesDesig =
        designation === 'All Designations' || emp.designation === designation;

      const matchesStatus =
        statusFilter === 'All Status' ||
        (statusFilter === 'Active' && emp.isActive) ||
        (statusFilter === 'Inactive' && !emp.isActive) ||
        emp.status === statusFilter;

      return matchesSearch && matchesDept && matchesDesig && matchesStatus;
    });
  }, [employees, search, department, designation, statusFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredEmployees.map((emp) => emp._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    const exportData = filteredEmployees.map((emp) => ({
      'Employee ID': emp.employeeId,
      Name: emp.name,
      Email: emp.email,
      Department: emp.department,
      Designation: emp.designation,
      'Joining Date': emp.joiningDate,
      Status: emp.status,
    }));
    downloadCsv('employees_directory.csv', exportData);
  };

  const handleDelete = async (emp) => {
    const accepted = await feedback.confirm(`Are you sure you want to remove ${emp.name}?`, {
      title: 'Delete Employee',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!accepted) return;
    try {
      if (emp._id.startsWith('emp-')) {
        setEmployees((prev) => prev.filter((item) => item._id !== emp._id));
      } else {
        await api.delete(`/api/users/${emp._id}`);
        load();
      }
      feedback.success('Employee record updated');
    } catch (err) {
      feedback.error(getApiError(err, 'Failed to delete employee'));
    }
  };

  if (loading && !employees.length) return <LoadingState label="Loading employees…" />;
  if (error && !employees.length) return <ErrorState message={error} retry={load} />;

  const totalEmployees = stats.totalEmployees ?? employees.length;
  const activeEmployees = stats.activeEmployees ?? employees.filter((e) => e.isActive !== false).length;
  const newJoiners = stats.newJoiners ?? 0;
  const inactiveEmployees = stats.inactiveEmployees ?? employees.filter((e) => e.isActive === false).length;

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header Matching Reference Mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3.5 sm:mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Employees
          </h1>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/add-employee')}
            className="bg-[#2563eb] hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Employee</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="bg-white border border-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-1.5 rounded-xl hover:bg-slate-50 shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download size={15} />
            <span>Export</span>
          </button>

          <button
            type="button"
            className="bg-white border border-slate-200 text-slate-600 p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            title="More Options"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* 2. Top 4 Metric KPI Cards Matching Reference Mockup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {/* Card 1: Total Employees */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">Total Employees</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none my-1">
              {totalEmployees}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <ArrowUpRight size={13} />
              <span>+5.2% from last month</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Employees */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] text-[#10b981] flex items-center justify-center shrink-0">
            <UserCheck size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">Active Employees</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none my-1">
              {activeEmployees}
            </div>
            <span className="text-[11px] font-medium text-slate-500 block">
              93.0% of total staff
            </span>
          </div>
        </div>

        {/* Card 3: New Joiners */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fffbeb] text-[#d97706] flex items-center justify-center shrink-0">
            <UserPlus size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">New Joiners</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none my-1">
              {newJoiners}
            </div>
            <span className="text-[11px] font-medium text-slate-500 block">
              This Month
            </span>
          </div>
        </div>

        {/* Card 4: Inactive Employees */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fef2f2] text-[#ef4444] flex items-center justify-center shrink-0">
            <UserX size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">Inactive Employees</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none my-1">
              {inactiveEmployees}
            </div>
            <span className="text-[11px] font-medium text-slate-500 block">
              7.0% of total staff
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar Matching Reference Mockup */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee by name, ID, email..."
            className="w-full bg-slate-50/70 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Dropdowns & Reset */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Dropdown */}
          <div className="relative">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="appearance-none bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
            >
              <option>All Departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept}>{dept}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Designation Dropdown */}
          <div className="relative">
            <select
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="appearance-none bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
            >
              <option>All Designations</option>
              {uniqueDesignations.map((desig) => (
                <option key={desig}>{desig}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Resigned</option>
              <option>Terminated</option>
              <option>Absconded</option>
              <option>Retired</option>
              <option>Contract Ended</option>
              <option>On Leave</option>
              <option>Inactive</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={resetFilters}
            className="border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} className="text-slate-500" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* 4. Directory Table Matching Reference Mockup */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length > 0 &&
                      selectedIds.length === filteredEmployees.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-2.5">EMP ID</th>
                <th className="py-2.5 px-2.5">EMPLOYEE</th>
                <th className="py-2.5 px-2.5">DEPARTMENT</th>
                <th className="py-2.5 px-2.5">DESIGNATION</th>
                <th className="py-2.5 px-2.5">JOINING DATE</th>
                <th className="py-2.5 px-2.5">STATUS</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No employees found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                const isSelected = selectedIds.includes(emp._id);
                return (
                  <tr
                    key={emp._id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(emp._id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Emp ID */}
                    <td className="py-2.5 px-2.5 font-semibold text-slate-800">
                      {emp.employeeId}
                    </td>

                    {/* Employee Avatar + Name + Email */}
                    <td className="py-2.5 px-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-slate-200 bg-slate-100 flex items-center justify-center">
                          {emp.avatar ? (
                            <img
                              src={emp.avatar}
                              alt={emp.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <span className={`w-full h-full flex items-center justify-center bg-slate-100 text-slate-600 font-bold text-xs ${emp.avatar ? 'hidden' : 'flex'}`}>
                            {emp.name?.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => navigate(`/employee/${emp._id}`)}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left block leading-tight cursor-pointer"
                          >
                            {emp.name}
                          </button>
                          <span className="text-[11px] text-slate-400 font-normal block leading-tight mt-0.5">
                            {emp.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-2.5 px-2.5 font-medium text-slate-700">
                      {emp.department}
                    </td>

                    {/* Designation */}
                    <td className="py-2.5 px-2.5 font-normal text-slate-600">
                      {emp.designation}
                    </td>

                    {/* Joining Date */}
                    <td className="py-2.5 px-2.5 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{emp.joiningDate}</span>
                      </div>
                    </td>

                    {/* Status Pill Chip */}
                    <td className="py-2.5 px-2.5">
                      {emp.status === 'Probation' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          In Probation
                        </span>
                      )}
                      {emp.status === 'Active' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#ecfdf5] text-[#059669]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                          Active
                        </span>
                      )}
                      {emp.status === 'On Leave' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#fffbeb] text-[#d97706]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                          On Leave
                        </span>
                      )}
                      {emp.status === 'Terminated' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Terminated
                        </span>
                      )}
                      {emp.status === 'Absconded' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          Absconded
                        </span>
                      )}
                      {emp.status === 'Resigned' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Resigned
                        </span>
                      )}
                      {emp.status === 'Retired' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          Retired
                        </span>
                      )}
                      {emp.status === 'Contract Ended' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          Contract Ended
                        </span>
                      )}
                      {!['Active', 'On Leave', 'Terminated', 'Absconded', 'Resigned', 'Retired', 'Contract Ended'].includes(emp.status) && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#fef2f2] text-[#dc2626]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                          {emp.status || 'Inactive'}
                        </span>
                      )}
                    </td>

                    {/* Actions: View, Edit, Delete */}
                    <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() => navigate(`/employee/${emp._id}`)}
                          className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => navigate(`/edit-employee/${emp._id}`)}
                          className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(emp)}
                          className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* 5. Dynamic Pagination */}
        <div className="p-4 sm:px-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
          <span>
            Showing {filteredEmployees.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} -{' '}
            {Math.min(currentPage * PAGE_SIZE, filteredEmployees.length)} of {filteredEmployees.length} employees
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                    p === currentPage
                      ? 'bg-[#2563eb] text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageEmployee;