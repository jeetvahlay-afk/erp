import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  Edit3,
  Plus,
  Route,
  Save,
  Search,
  Shield,
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
  Modal,
  PageHeader,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';
import { availableRoutes } from '../lib/routeAccess';

const emptyRole = { name: '', description: '', allowedRoutes: [] };

const ManageRoles = () => {
  const { user: signedInUser, refreshUser } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyRole);
  const [routeSearch, setRouteSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/roles');
      setRoles(asArray(data));
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
    setModalOpen(true);
  };

  const openEdit = (role) => {
    const existingRoutes = Array.isArray(role.allowedRoutes) && role.allowedRoutes.length > 0
      ? role.allowedRoutes
      : (Array.isArray(role.permissions) ? role.permissions.filter((p) => p.startsWith('/')) : []);
    setForm({
      _id: role._id,
      name: role.name,
      description: role.description || '',
      allowedRoutes: existingRoutes,
      isSystem: role.isSystem,
    });
    setRouteSearch('');
    setModalOpen(true);
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
    return query
      ? availableRoutes.filter((route) =>
          `${route.name} ${route.description} ${route.path}`.toLowerCase().includes(query)
        )
      : availableRoutes;
  }, [routeSearch]);

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
      };
      if (form._id) await api.put(`/api/roles/${form._id}`, payload);
      else await api.post('/api/roles', payload);
      if (signedInUser?.role?.toLowerCase() === form.name.trim().toLowerCase()) {
        await refreshUser().catch(() => {});
      }
      feedback.success(form._id ? 'Role updated.' : 'Role created.');
      setModalOpen(false);
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to save role'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (role) => {
    const accepted = await feedback.confirm(
      `Delete the “${role.name}” role? Assigned roles cannot be deleted.`,
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
              <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">ROLE NAME</th>
                <th className="py-2.5 px-2.5">DESCRIPTION</th>
                <th className="py-2.5 px-2.5">AUTHORIZED ROUTES</th>
                <th className="py-2.5 px-2.5">TYPE</th>
                <th className="py-2.5 px-2.5">STATUS</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {roles.map((role) => {
                const assignedCount = (role.allowedRoutes || []).length;
                const isSuperOrAdmin = role.isSystem && ['super admin', 'admin'].includes(String(role.name).toLowerCase());

                return (
                  <tr key={role._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Shield size={16} />
                        </div>
                        <div>
                          <strong className="text-slate-900 font-bold block">{role.name}</strong>
                          <span className="text-[11px] text-slate-400">Authorization role</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600">
                      {role.description || 'No description provided'}
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      {isSuperOrAdmin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap">
                          <ShieldCheck size={13} className="text-blue-600 shrink-0" />
                          <span>All 32 Routes</span>
                        </span>
                      ) : assignedCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 whitespace-nowrap">
                          <Check size={13} className="text-emerald-600 shrink-0" />
                          <span>{assignedCount} routes assigned</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60 whitespace-nowrap">
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
                          className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit Role & Routes"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          disabled={role.isSystem}
                          onClick={() => remove(role)}
                          className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer"
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

      {/* Role Modal */}
      <Modal
        open={modalOpen}
        title={form._id ? 'Edit Role' : 'Create Role'}
        subtitle="Define a meaningful role name, description, and assign authorized routes."
        onClose={() => setModalOpen(false)}
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              <strong>{(form.allowedRoutes || []).length}</strong> of {availableRoutes.length} routes selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition active:scale-[0.98] disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saving ? 'Saving…' : 'Save Role'}</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <input
                value={form.name}
                disabled={form.isSystem}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Payroll Analyst, Project Manager"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Description (Optional)
              </label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe responsibilities and intended access levels..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Assign Route Permissions</h4>
                <p className="text-[11px] text-slate-400">
                  Select which of the 32 application routes are accessible to employees with this role.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllRoutes}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  <CheckSquare size={13} />
                  <span>Select All</span>
                </button>
                <button
                  type="button"
                  onClick={clearAllRoutes}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  <XSquare size={13} />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                placeholder="Filter routes by name or path..."
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-7 py-1.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {routeSearch && (
                <button
                  type="button"
                  onClick={() => setRouteSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Route Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto p-0.5">
              {visibleRoutes.map((route) => {
                const active = (form.allowedRoutes || []).includes(route.path);
                return (
                  <div
                    key={route.path}
                    onClick={() => toggleRoute(route.path)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer select-none ${
                      active
                        ? 'bg-blue-50/50 border-blue-500 shadow-2xs ring-1 ring-blue-500/20'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition-colors ${
                          active
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <strong className="text-xs font-bold text-slate-900 block truncate mb-0.5">
                        {route.name}
                      </strong>
                      <p className="text-[11px] text-slate-500 leading-snug line-clamp-1 mb-1">
                        {route.description}
                      </p>
                      <code className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 inline-block truncate max-w-full">
                        {route.path}
                      </code>
                    </div>
                  </div>
                );
              })}
            </div>

            {!visibleRoutes.length && (
              <div className="text-center py-6 text-xs text-slate-400">
                No routes found matching &quot;{routeSearch}&quot;.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageRoles;
