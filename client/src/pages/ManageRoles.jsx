import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  DollarSign,
  Edit3,
  Layers,
  Plus,
  RotateCcw,
  Route,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XSquare,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import { useAuth } from '../context/AuthContext';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';
import { availableRoutes } from '../lib/routeAccess';

const emptyRole = { name: '', description: '', allowedRoutes: [], dataScope: 'all' };

// Organized ERP Module Categories for the 30 application routes
const ROUTE_MODULES = [
  {
    id: 'dashboards',
    name: 'Executive Dashboards',
    icon: Layers,
    description: 'High-level business intelligence, HR overview, and employee personal dashboards.',
    routes: ['/dashboard/admin', '/dashboard/hr', '/dashboard/employee'],
  },
  {
    id: 'workforce',
    name: 'Workforce & Employees',
    icon: Users,
    description: 'Staff directory, department structure, and employee profile change requests.',
    routes: ['/manage-employee', '/manage-departments', '/profile-requests'],
  },
  {
    id: 'attendance',
    name: 'Time, Shift & Attendance',
    icon: Clock,
    description: 'Time tracking, shift definitions, daily break scheduling, and attendance registers.',
    routes: ['/manage-attendance', '/manage-shift', '/break-config', '/manage-breaks', '/attendance', '/take-break'],
  },
  {
    id: 'leaves',
    name: 'Leaves & Time Off',
    icon: Calendar,
    description: 'Company leave applications, balance auditing, and managerial approvals.',
    routes: ['/manage-leaves', '/leaves'],
  },
  {
    id: 'payroll',
    name: 'Payroll & Compensation',
    icon: DollarSign,
    description: 'Salary structures, monthly payroll disbursement, payslips, and compensation.',
    routes: ['/payrolls', '/salary-config', '/my-payroll'],
  },
  {
    id: 'reports_tasks',
    name: 'Work Reports & Tasks',
    icon: Route,
    description: 'Daily work reports submission & audit, project task lists, and Kanban tracking.',
    routes: ['/work-reports', '/my-work-report', '/tasks'],
  },
  {
    id: 'recruitment',
    name: 'Recruitment & Talent',
    icon: ShieldCheck,
    description: 'Candidate pipelines, online assessment portal tracking, and interview rounds.',
    routes: ['/manage-interviews'],
  },
  {
    id: 'workspace',
    name: 'Employee Hub & Workspace',
    icon: Building2,
    description: 'Company announcements, upcoming employee birthdays, events, and document locker.',
    routes: ['/announcements', '/birthdays', '/events', '/my-documents'],
  },
  {
    id: 'system',
    name: 'System, Roles & Security',
    icon: Shield,
    description: 'Role-based access control, individual route assignments, audit logs, and system config.',
    routes: ['/manage-roles', '/manage-routes', '/audit-logs', '/configurations', '/accounts-config'],
  },
];

const ManageRoles = () => {
  const { user: signedInUser, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // View mode: 'list' | 'editor'
  const [viewMode, setViewMode] = useState('list');
  const [form, setForm] = useState(emptyRole);
  const [routeSearch, setRouteSearch] = useState('');
  const [selectedModuleTab, setSelectedModuleTab] = useState('all');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/roles');
      const roleList = asArray(data);
      setRoles(roleList);

      // Check if URL specifies editing or creating
      const action = searchParams.get('action');
      const editId = searchParams.get('edit');
      if (action === 'create') {
        setForm(emptyRole);
        setViewMode('editor');
      } else if (editId) {
        const found = roleList.find((r) => r._id === editId);
        if (found) {
          openEdit(found, false);
        }
      }
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load roles'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyRole);
    setRouteSearch('');
    setSelectedModuleTab('all');
    setViewMode('editor');
    setSearchParams({ action: 'create' });
  };

  const openEdit = (role, updateUrl = true) => {
    const existingRoutes = Array.isArray(role.allowedRoutes) && role.allowedRoutes.length > 0
      ? role.allowedRoutes
      : (Array.isArray(role.permissions) ? role.permissions.filter((p) => p.startsWith('/')) : []);
    setForm({
      _id: role._id,
      name: role.name,
      description: role.description || '',
      allowedRoutes: existingRoutes,
      dataScope: role.dataScope || 'all',
      isSystem: role.isSystem,
    });
    setRouteSearch('');
    setSelectedModuleTab('all');
    setViewMode('editor');
    if (updateUrl) {
      setSearchParams({ edit: role._id });
    }
  };

  const closeEditor = () => {
    setViewMode('list');
    setForm(emptyRole);
    setSearchParams({});
  };

  const toggleRoute = (path) => {
    setForm((current) => {
      const existing = current.allowedRoutes || [];
      const updated = existing.includes(path)
        ? existing.filter((route) => route !== path)
        : [...existing, path];
      return { ...current, allowedRoutes: updated };
    });
  };

  const toggleModuleRoutes = (moduleRoutePaths) => {
    setForm((current) => {
      const existing = current.allowedRoutes || [];
      const allSelected = moduleRoutePaths.every((p) => existing.includes(p));
      let updated;
      if (allSelected) {
        updated = existing.filter((p) => !moduleRoutePaths.includes(p));
      } else {
        updated = [...new Set([...existing, ...moduleRoutePaths])];
      }
      return { ...current, allowedRoutes: updated };
    });
  };

  const selectAllRoutes = () => {
    setForm((current) => ({
      ...current,
      allowedRoutes: availableRoutes.map((route) => route.path),
    }));
  };

  const clearAllRoutes = () => {
    setForm((current) => ({
      ...current,
      allowedRoutes: [],
    }));
  };

  const visibleRoutes = useMemo(() => {
    const query = routeSearch.trim().toLowerCase();
    return availableRoutes.filter((route) => {
      const matchesSearch = query
        ? `${route.name} ${route.description} ${route.path}`.toLowerCase().includes(query)
        : true;
      const matchesTab = selectedModuleTab === 'all'
        ? true
        : ROUTE_MODULES.find((m) => m.id === selectedModuleTab)?.routes.includes(route.path);
      return matchesSearch && matchesTab;
    });
  }, [routeSearch, selectedModuleTab]);

  const save = async () => {
    if (!form.name.trim()) {
      feedback.error('Role name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        allowedRoutes: form.allowedRoutes || [],
        dataScope: form.dataScope || 'all',
      };
      if (form._id) await api.put(`/api/roles/${form._id}`, payload);
      else await api.post('/api/roles', payload);
      if (signedInUser?.role?.toLowerCase() === form.name.trim().toLowerCase()) {
        await refreshUser().catch(() => {});
      }
      feedback.success(form._id ? 'Role updated successfully.' : 'Role created successfully.');
      closeEditor();
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to save role'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (role) => {
    const accepted = await feedback.confirm(
      `Delete the "${role.name}" role? Assigned roles cannot be deleted.`,
      { title: 'Delete role', confirmLabel: 'Delete role', tone: 'danger' }
    );
    if (!accepted) return;
    try {
      await api.delete(`/api/roles/${role._id}`);
      feedback.success('Role deleted.');
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to delete role'));
    }
  };

  if (loading) return <LoadingState label="Loading role architecture…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  const systemRoles = roles.filter((r) => r.isSystem).length;
  const customRoles = roles.length - systemRoles;
  const activeRoutesCount = (form.allowedRoutes || []).length;
  const coveragePercent = Math.round((activeRoutesCount / availableRoutes.length) * 100);

  // ==========================================
  // VIEW 1: DETAILED ROLE CONFIGURATION PAGE
  // ==========================================
  if (viewMode === 'editor') {
    return (
      <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-12 animate-in fade-in duration-150">
        {/* 1. Page Header */}
        <PageHeader
          title={form._id ? `Edit Role: ${form.name}` : 'Create New Role'}
          breadcrumbs={['System & Config', 'Roles & Permissions', form._id ? 'Edit Role' : 'Create Role']}
          actions={
            <div className="flex items-center gap-2">
              <ToolbarButton icon={ArrowLeft} onClick={closeEditor}>
                Back to Roles
              </ToolbarButton>
              <ToolbarButton primary icon={Save} disabled={saving} onClick={save}>
                {saving ? 'Saving Role…' : 'Save Role'}
              </ToolbarButton>
            </div>
          }
        />

        {/* 2. Main Two-Column Detailed Configuration Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* Main Left Configuration Column (8 cols) */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-4.5">
            {/* Card 1: Basic Role Credentials */}
            <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 12%, transparent)',
                      color: 'var(--erp-primary, #2563eb)',
                    }}
                  >
                    <Shield size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Role Credentials
                    </h3>
                  </div>
                </div>
                {form.isSystem && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">
                    <ShieldAlert size={12} />
                    <span>System Role</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Role Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    disabled={form.isSystem}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter role title"
                    className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Description & Responsibility Summary
                  </label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Briefly describe intended access levels and departmental duties..."
                    className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Organizational Data Access Scope */}
            <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Data Access Scope
                    </h3>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  Scope: {form.dataScope === 'department' ? 'Department Only' : 'Company Wide'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* Option 1: Admin / All Employees Scope */}
                <div
                  onClick={() => setForm({ ...form, dataScope: 'all' })}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all select-none relative ${
                    form.dataScope !== 'department'
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          form.dataScope !== 'department'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Building2 size={14} />
                      </div>
                      <div>
                        <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                          Admin Scope (All Employees)
                        </strong>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">
                          Organization-wide Access
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center ${
                        form.dataScope !== 'department'
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {form.dataScope !== 'department' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2.5">
                    Users assigned this role view and manage records across <strong>all company departments</strong> for every authorized section.
                  </p>
                  <ul className="text-[10.5px] text-slate-500 dark:text-slate-400 space-y-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                    <li className="flex items-center gap-1.5">
                      <Check size={11} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Company-wide attendance, leaves & employee profiles</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={11} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Cross-department work reports, payroll & audit visibility</span>
                    </li>
                  </ul>
                </div>

                {/* Option 2: Department Head Scope */}
                <div
                  onClick={() => setForm({ ...form, dataScope: 'department' })}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all select-none relative ${
                    form.dataScope === 'department'
                      ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          form.dataScope === 'department'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Users size={14} />
                      </div>
                      <div>
                        <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                          Department Head (Own Dept Only)
                        </strong>
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">
                          Department Scoped
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center ${
                        form.dataScope === 'department'
                          ? 'border-purple-600 bg-purple-600'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {form.dataScope === 'department' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2.5">
                    Users assigned this role are strictly restricted to records belonging to <strong>their own assigned department</strong> across all system modules.
                  </p>
                  <ul className="text-[10.5px] text-slate-500 dark:text-slate-400 space-y-1 pt-1.5 border-t border-purple-200/60 dark:border-slate-800">
                    <li className="flex items-center gap-1.5">
                      <Check size={11} className="text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>Scoped in Attendance, Breaks, Leaves, Work Reports, Tasks & Payroll</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={11} className="text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>Data from all other departments is strictly protected and hidden across the ERP</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Card 3: Categorized Route Permissions */}
            <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Application Route Permissions
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllRoutes}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <CheckSquare size={13} />
                    <span>Select All ({availableRoutes.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearAllRoutes}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <XSquare size={13} />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* Search & Module Filter Tabs */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={routeSearch}
                    onChange={(e) => setRouteSearch(e.target.value)}
                    placeholder="Search routes by title, description, or system path (/manage-...)"
                    className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {routeSearch && (
                    <button
                      type="button"
                      onClick={() => setRouteSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Module Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedModuleTab('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      selectedModuleTab === 'all'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    All Modules ({availableRoutes.length})
                  </button>
                  {ROUTE_MODULES.map((mod) => {
                    const countInRole = mod.routes.filter((p) => (form.allowedRoutes || []).includes(p)).length;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setSelectedModuleTab(mod.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all ${
                          selectedModuleTab === mod.id
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{mod.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          selectedModuleTab === mod.id
                            ? 'bg-white/20 text-white'
                            : countInRole > 0
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {countInRole}/{mod.routes.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Categorized Route Modules Grid */}
              <div className="space-y-4">
                {ROUTE_MODULES.filter((mod) => selectedModuleTab === 'all' || selectedModuleTab === mod.id).map((mod) => {
                  const modRoutes = availableRoutes.filter((r) => mod.routes.includes(r.path));
                  const displayedRoutes = modRoutes.filter((r) => visibleRoutes.some((vr) => vr.path === r.path));
                  if (!displayedRoutes.length) return null;

                  const allModSelected = modRoutes.every((r) => (form.allowedRoutes || []).includes(r.path));
                  const selectedCount = modRoutes.filter((r) => (form.allowedRoutes || []).includes(r.path)).length;
                  const Icon = mod.icon;

                  return (
                    <div
                      key={mod.id}
                      className="rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 p-3.5"
                    >
                      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                            <Icon size={13} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {mod.name}
                            </h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2 py-0.5 rounded-full">
                            {selectedCount} of {modRoutes.length} active
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleModuleRoutes(mod.routes)}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer transition ${
                              allModSelected
                                ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                            }`}
                          >
                            {allModSelected ? 'Deselect Module' : 'Select Module'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {displayedRoutes.map((route) => {
                          const active = (form.allowedRoutes || []).includes(route.path);
                          return (
                            <div
                              key={route.path}
                              onClick={() => toggleRoute(route.path)}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer select-none ${
                                active
                                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 shadow-2xs ring-1 ring-blue-500/20'
                                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300'
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                <div
                                  className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition-colors ${
                                    active
                                      ? 'bg-blue-600 text-white'
                                      : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-transparent'
                                  }`}
                                >
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <strong className="text-xs font-bold text-slate-900 dark:text-white block truncate mb-0.5">
                                  {route.name}
                                </strong>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-1 mb-1">
                                  {route.description}
                                </p>
                                <code className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700 inline-block truncate max-w-full">
                                  {route.path}
                                </code>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Live Role Specification & Actions (4 cols) */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-4.5 sticky top-5">
            {/* Live Role Summary Card */}
            <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 sm:p-5">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  LIVE ROLE SPECIFICATION
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {form.name || 'Untitled Role'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {form.description || 'No role description provided yet.'}
                </p>
              </div>

              {/* Data Scope Tag */}
              <div className="mb-4">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                  Assigned Data Scope:
                </span>
                {form.dataScope === 'department' ? (
                  <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center gap-2">
                    <Users size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <strong className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                        Department Head Scope
                      </strong>
                      <span className="text-[10px] text-purple-700 dark:text-purple-400">
                        Restricted across all sections to assigned department
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                    <Building2 size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <strong className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                        Admin Scope (All Employees)
                      </strong>
                      <span className="text-[10px] text-blue-700 dark:text-blue-400">
                        Company-wide visibility across all departments
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Coverage Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Route Authorization</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {activeRoutesCount} / {availableRoutes.length} ({coveragePercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${coveragePercent}%` }}
                  />
                </div>
              </div>

              {/* Module Coverage Breakdown */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  MODULE COVERAGE
                </span>
                {ROUTE_MODULES.map((mod) => {
                  const count = mod.routes.filter((p) => (form.allowedRoutes || []).includes(p)).length;
                  const total = mod.routes.length;
                  return (
                    <div key={mod.id} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-slate-600 dark:text-slate-400 truncate pr-2">{mod.name}</span>
                      <span className={`text-[11px] font-bold font-mono ${
                        count === total
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : count > 0
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400'
                      }`}>
                        {count}/{total}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={save}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
                >
                  <Save size={14} />
                  <span>{saving ? 'Saving Role…' : 'Save Role Configuration'}</span>
                </button>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>Cancel / Back to List</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ROLES & PERMISSIONS ARCHITECTURE LIST
  // ==========================================
  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="Roles & Permissions"
        breadcrumbs={['System & Config', 'Roles & Permissions']}
        actions={
          <ToolbarButton primary icon={Plus} onClick={openCreate}>
            Create Role
          </ToolbarButton>
        }
      />

      {/* 2. Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
        <MetricCard
          label="Total Roles"
          value={roles.length}
          helper="Access levels defined"
          icon={Shield}
          tone="blue"
        />
        <MetricCard
          label="System Core Roles"
          value={systemRoles}
          helper="Protected core system roles"
          icon={ShieldCheck}
          tone="green"
        />
        <MetricCard
          label="Custom Roles"
          value={customRoles}
          helper="User-defined privilege profiles"
          icon={Users}
          tone="purple"
        />
      </div>

      {/* 3. TableShell */}
      <TableShell
        title="Role Architecture"
        summary={`${roles.length} role${roles.length === 1 ? '' : 's'} configured`}
      >
        {roles.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">ROLE NAME</th>
                <th className="py-2.5 px-2.5">DESCRIPTION</th>
                <th className="py-2.5 px-2.5">DATA SCOPE</th>
                <th className="py-2.5 px-2.5">AUTHORIZED ROUTES</th>
                <th className="py-2.5 px-2.5">TYPE</th>
                <th className="py-2.5 px-2.5">STATUS</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {roles.map((role) => {
                const assignedCount = (role.allowedRoutes || []).length;
                const isSuperOrAdmin = role.isSystem && ['super admin', 'admin'].includes(String(role.name).toLowerCase());

                return (
                  <tr key={role._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 12%, transparent)',
                            color: 'var(--erp-primary, #2563eb)',
                          }}
                        >
                          <Shield size={16} />
                        </div>
                        <div>
                          <strong className="text-slate-900 dark:text-white font-bold block">{role.name}</strong>
                          <span className="text-[11px] text-slate-400">Authorization role</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-400">
                      {role.description || 'No description provided'}
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      {role.dataScope === 'department' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                          <Users size={12} className="text-purple-600 dark:text-purple-400 shrink-0" />
                          <span>Department Only</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                          <Building2 size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>All Employees (Admin)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      {isSuperOrAdmin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 whitespace-nowrap">
                          <ShieldCheck size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>All 30 Routes</span>
                        </span>
                      ) : assignedCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 whitespace-nowrap">
                          <Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{assignedCount} routes assigned</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 whitespace-nowrap">
                          <Route size={13} className="text-slate-400 shrink-0" />
                          <span>Default routes</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5">
                      <StatusBadge tone={role.isSystem ? 'info' : 'warning'}>
                        {role.isSystem ? 'System Core' : 'Custom Role'}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <StatusBadge>{role.isActive === false ? 'Inactive' : 'Active'}</StatusBadge>
                    </td>
                    <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={isSuperOrAdmin}
                          onClick={() => openEdit(role)}
                          className="w-8 h-8 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer"
                          title="Configure Role, Data Scope & Routes"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          disabled={role.isSystem}
                          onClick={() => remove(role)}
                          className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete Role"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No roles configured"
            message="Create a role to begin defining workforce access."
          />
        )}
      </TableShell>
    </div>
  );
};

export default ManageRoles;
