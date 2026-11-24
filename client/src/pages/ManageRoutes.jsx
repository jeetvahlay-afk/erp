import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  Route,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  XSquare,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import { useAuth } from '../context/AuthContext';
import {
  Avatar,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  StatusBadge,
} from '../components/ui/EnterpriseUI';
import { availableRoutes, availableRoutePaths } from '../lib/routeAccess';

const ManageRoutes = () => {
  const { user: signedInUser, refreshUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [routeSearch, setRouteSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/users');
      setUsers(asArray(data));
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load employees'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      users.filter((user) =>
        `${user.name} ${user.email} ${user.employeeId || ''}`.toLowerCase().includes(search.toLowerCase())
      ),
    [search, users]
  );

  const visibleRoutes = useMemo(() => {
    const query = routeSearch.trim().toLowerCase();
    return query
      ? availableRoutes.filter((route) =>
          `${route.name} ${route.description} ${route.path}`.toLowerCase().includes(query)
        )
      : availableRoutes;
  }, [routeSearch]);

  const open = (user) => {
    setSelected(user);
    setRoutes((user.allowedRoutes || []).filter((path) => availableRoutePaths.has(path)));
    setRouteSearch('');
  };

  const toggle = (path) => {
    setRoutes((current) =>
      current.includes(path) ? current.filter((route) => route !== path) : [...current, path]
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/api/users/${selected._id}`, { allowedRoutes: routes });
      const savedUser = data?.user || (data?._id ? data : { ...selected, allowedRoutes: routes });
      setUsers((current) =>
        current.map((user) => (user._id === selected._id ? { ...user, ...savedUser } : user))
      );
      if (String(signedInUser?._id) === String(selected._id)) {
        await refreshUser();
      }
      feedback.success('Assigned routes saved successfully.');
      setSelected(null);
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to update route access'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading route assignments…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  const adminCount = users.filter((u) => ['admin', 'super admin'].includes(String(u.role).toLowerCase())).length;
  const customCount = users.filter((u) => (u.allowedRoutes || []).length > 0).length;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="Route Configuration"
        breadcrumbs={['System & Config', 'Route Configuration']}
        actions={
          <div className="relative w-64 sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee by name, role, or ID..."
              className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                title="Clear"
              >
                <X size={13} />
              </button>
            )}
          </div>
        }
      />

      {/* 2. KPI Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
        <MetricCard
          label="Total Employees"
          value={users.length}
          helper="Workforce members under management"
          icon={Users}
        />
        <MetricCard
          label="Custom Route Access"
          value={customCount}
          helper="Employees with custom sidebar menus"
          tone="emerald"
          icon={UserCheck}
        />
        <MetricCard
          label="Full Administrators"
          value={adminCount}
          helper="System super admins and admins"
          tone="blue"
          icon={ShieldCheck}
        />
      </div>

      {/* 3. Main Employee Route Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
          <div>
            <h2 className="text-base font-bold text-slate-900">Employee Route Access</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Every non-administrator sees only the routes assigned here. Administrators retain full access.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap self-start sm:self-auto">
            Showing {filtered.length} of {users.length} employees
          </span>
        </div>

        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">EMPLOYEE</th>
                  <th className="py-2.5 px-2.5">ROLE</th>
                  <th className="py-2.5 px-2.5">ACCESS SUMMARY</th>
                  <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">CONFIGURATION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((user) => {
                  const assigned = (user.allowedRoutes || []).filter((path) => availableRoutePaths.has(path));
                  const administrator = ['admin', 'super admin'].includes(String(user.role).toLowerCase());

                  return (
                    <tr key={user._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Employee Column */}
                      <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar user={user} size="sm" />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate text-xs">
                              {user.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                              {user.email} {user.employeeId ? `· ${user.employeeId}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <StatusBadge tone="info">{user.role}</StatusBadge>
                      </td>

                      {/* Access Summary Column */}
                      <td className="py-2.5 px-2.5">
                        {administrator ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap">
                              <ShieldCheck size={13} className="text-blue-600 shrink-0" />
                              <span>Full Admin Access</span>
                            </span>
                            <span className="text-[11px] text-slate-400 hidden md:inline">
                              All workspace routes
                            </span>
                          </div>
                        ) : assigned.length ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 whitespace-nowrap">
                              <Check size={13} className="text-emerald-600 shrink-0" />
                              <span>{assigned.length} assigned routes</span>
                            </span>
                            <span className="text-[11px] text-slate-400 hidden md:inline">
                              Configured menu access
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60 whitespace-nowrap">
                              <Route size={13} className="text-slate-400 shrink-0" />
                              <span>Default Access</span>
                            </span>
                            <span className="text-[11px] text-slate-400 hidden md:inline">
                              Role defaults apply
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Configuration Action Button Column */}
                      <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => open(user)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 shadow-2xs cursor-pointer active:scale-[0.98]"
                        >
                          <Settings2 size={14} className="text-slate-400 group-hover:text-blue-600" />
                          <span>Configure Access</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No employees found"
            message={search ? `No employees matched "${search}". Try searching for another name.` : 'No employees currently registered in the system.'}
          />
        )}
      </div>

      {/* 4. Modern Route Configuration Modal */}
      <Modal
        open={Boolean(selected)}
        title="Assign Route Access"
        subtitle={selected ? `${selected.name} (${selected.role}) · ${selected.employeeId || selected.email}` : ''}
        onClose={() => setSelected(null)}
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              <strong>{routes.length}</strong> of {availableRoutes.length} routes selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
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
                <span>{saving ? 'Saving…' : 'Save Access'}</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Top Search & Bulk Select Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                placeholder="Search routes by title, module, or path (e.g. /dashboard/admin)..."
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

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setRoutes(availableRoutes.map((route) => route.path))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer"
              >
                <CheckSquare size={13} />
                <span>Select All</span>
              </button>
              <button
                type="button"
                onClick={() => setRoutes([])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-slate-50 transition cursor-pointer"
              >
                <XSquare size={13} />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Route Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto p-0.5">
            {visibleRoutes.map((route) => {
              const active = routes.includes(route.path);
              return (
                <div
                  key={route.path}
                  onClick={() => toggle(route.path)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer select-none ${
                    active
                      ? 'bg-blue-50/50 border-blue-500 shadow-2xs ring-1 ring-blue-500/20'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      <Check size={13} strokeWidth={3} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <strong className="text-xs font-bold text-slate-900 block truncate">
                        {route.name}
                      </strong>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug line-clamp-2 mb-1.5">
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
            <div className="text-center py-8 text-xs text-slate-400">
              No routes found matching &quot;{routeSearch}&quot;.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ManageRoutes;
