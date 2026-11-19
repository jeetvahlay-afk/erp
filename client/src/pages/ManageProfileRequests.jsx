import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Download,
  RotateCcw,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import { downloadCsv } from '../lib/export';
import {
  Avatar,
  EmptyState,
  ErrorState,
  formatDate,
  LoadingState,
  MetricCard,
  PageHeader,
  SearchInput,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const ManageProfileRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/profile-requests');
      setRequests(asArray(data));
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load profile requests'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const processRequest = async (id, status) => {
    const accepted = await feedback.confirm(
      `${status === 'approved' ? 'Approve' : 'Reject'} this profile update?`,
      {
        title: 'Profile Update Decision',
        confirmLabel: status === 'approved' ? 'Approve' : 'Reject',
        tone: status === 'approved' ? 'primary' : 'danger',
      }
    );
    if (!accepted) return;
    try {
      await api.put(`/api/profile-requests/${id}`, { status });
      feedback.success(`Profile update ${status}.`);
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to process request'));
    }
  };

  const filtered = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus = filter === 'all' || request.status === filter;
      const value = `${request.user?.name || ''} ${request.user?.employeeId || ''} ${
        request.field || ''
      }`.toLowerCase();
      return matchesStatus && value.includes(search.toLowerCase());
    });
  }, [filter, requests, search]);

  if (loading) return <LoadingState label="Loading profile update queue…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  const counts = requests.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="Profile Update Queue"
        breadcrumbs={['HR Management', 'Profile Requests']}
        actions={
          <ToolbarButton
            icon={Download}
            disabled={!filtered.length}
            onClick={() => downloadCsv('profile-update-requests.csv', filtered)}
          >
            Export CSV
          </ToolbarButton>
        }
      />

      {/* 2. Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard
          label="Pending Review"
          value={counts.pending || 0}
          helper="Awaiting HR approval"
          icon={Clock}
          tone="amber"
        />
        <MetricCard
          label="Approved Changes"
          value={counts.approved || 0}
          helper="Updated in employee records"
          icon={CheckCircle2}
          tone="green"
        />
        <MetricCard
          label="Rejected Changes"
          value={counts.rejected || 0}
          helper="Declined change requests"
          icon={XCircle}
          tone="red"
        />
        <MetricCard
          label="Total Requests"
          value={requests.length}
          helper="All recorded change requests"
          icon={Users}
          tone="blue"
        />
      </div>

      {/* 3. TableShell */}
      <TableShell
        title="Field Change Requests"
        summary={`${filtered.length} request${filtered.length === 1 ? '' : 's'} displayed`}
        toolbar={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search employee, field name..."
            />
            <select
              className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="pending">Pending Only</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Statuses</option>
            </select>
            {(search || filter !== 'pending') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFilter('pending');
                }}
                className="border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} className="text-slate-500" />
                <span>Reset</span>
              </button>
            )}
          </>
        }
        footer={<span>Showing {filtered.length} entries</span>}
      >
        {filtered.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">EMPLOYEE</th>
                <th className="py-2.5 px-2.5">FIELD REQUESTED</th>
                <th className="py-2.5 px-2.5">CURRENT VALUE</th>
                <th className="py-2.5 px-2.5">PROPOSED CHANGE</th>
                <th className="py-2.5 px-2.5">REQUESTED ON</th>
                <th className="py-2.5 px-2.5">STATUS</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((request) => (
                <tr key={request._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar user={request.user} size="sm" />
                      <div>
                        <strong className="block text-slate-900 font-bold leading-tight">
                          {request.user?.name || 'Employee'}
                        </strong>
                        <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">
                          {request.user?.employeeId || '—'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 font-semibold text-slate-700">
                    {String(request.field || 'Unknown').replace(/([A-Z])/g, ' $1')}
                  </td>
                  <td className="py-2.5 px-2.5 text-slate-500">{String(request.oldValue ?? '—')}</td>
                  <td className="py-2.5 px-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-blue-600">
                      <ArrowRight size={13} className="text-slate-400" />
                      <span>{String(request.newValue ?? '—')}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 text-slate-500">
                    {formatDate(request.createdAt, { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-2.5">
                    <StatusBadge>{request.status}</StatusBadge>
                  </td>
                  <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                    {request.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => processRequest(request._id, 'approved')}
                          className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
                          title="Approve"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => processRequest(request._id, 'rejected')}
                          className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors cursor-pointer"
                          title="Reject"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No profile requests found"
            message="No profile update requests match the current filters."
          />
        )}
      </TableShell>
    </div>
  );
};

export default ManageProfileRequests;