import { useEffect, useState } from 'react';
import {
  Clock,
  Download,
  Fingerprint,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { downloadCsv } from '../lib/export';
import {
  EmptyState,
  ErrorState,
  formatDate,
  LoadingState,
  MetricCard,
  PageHeader,
  Pagination,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const actionTone = (action = '') => {
  if (action.includes('login') || action.includes('auth')) return 'info';
  if (action.includes('punch') || action.includes('attendance')) return 'success';
  if (action.includes('delete') || action.includes('reject')) return 'danger';
  if (action.includes('update') || action.includes('edit')) return 'warning';
  return 'neutral';
};

const AuditLogs = () => {
  const [state, setState] = useState({ items: [], pagination: null, loading: true, error: '' });
  const [page, setPage] = useState(1);

  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const { data } = await api.get(`/api/audit-logs?page=${page}&limit=50`);
      setState({ items: asArray(data), pagination: data.pagination, loading: false, error: '' });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: getApiError(error, 'Audit logs could not be loaded'),
      }));
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  if (state.loading && state.items.length === 0) return <LoadingState label="Loading audit trail…" />;
  if (state.error && state.items.length === 0) return <ErrorState message={state.error} retry={load} />;

  const authEventsCount = state.items.filter((item) => String(item.action).includes('auth')).length;
  const attendanceEventsCount = state.items.filter((item) =>
    String(item.action).includes('attendance')
  ).length;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header */}
      <PageHeader
        title="Audit Logs"
        breadcrumbs={['System & Config', 'Audit Logs']}
        actions={
          <>
            <ToolbarButton
              icon={Download}
              disabled={!state.items.length}
              onClick={() => downloadCsv('audit-trail.csv', state.items)}
            >
              Export CSV
            </ToolbarButton>
            <ToolbarButton primary icon={RefreshCw} onClick={load}>
              Refresh Logs
            </ToolbarButton>
          </>
        }
      />

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard
          label="Total Logged Events"
          value={state.items.length}
          helper="Immutable security records"
          icon={ShieldCheck}
          tone="blue"
        />
        <MetricCard
          label="Authentication Events"
          value={authEventsCount}
          helper="Logins, logouts & password updates"
          icon={KeyRound}
          tone="purple"
        />
        <MetricCard
          label="Attendance Logs"
          value={attendanceEventsCount}
          helper="Punches & shift activities"
          icon={Clock}
          tone="green"
        />
        <MetricCard
          label="Tamper Protection"
          value="Enabled"
          helper="SHA-256 verified trail"
          icon={Fingerprint}
          tone="teal"
        />
      </div>

      {/* 3. Table */}
      <TableShell
        title="Security & System Activity"
        summary="Append-only audit record of sensitive and administrative workforce actions"
        tools={false}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500">
              Showing {state.items.length} live records
            </span>
            <Pagination
              page={state.pagination?.page || page}
              pages={state.pagination?.pages || 1}
              onPage={setPage}
            />
          </div>
        }
      >
        {state.items.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">TIMESTAMP</th>
                <th className="py-2.5 px-2.5">ACTOR</th>
                <th className="py-2.5 px-2.5">ACTION EVENT</th>
                <th className="py-2.5 px-2.5">TARGET ENTITY</th>
                <th className="py-2.5 px-2.5">ENTITY ID</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">REQUEST ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {state.items.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 pl-4 sm:pl-5 pr-2.5 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-slate-400" />
                      <span>{formatDate(item.createdAt, { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5">
                    <strong className="block text-slate-900 font-bold leading-tight">
                      {item.actor?.name || 'System / Automated'}
                    </strong>
                    <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">
                      {item.actor?.email || 'System daemon'}
                    </span>
                  </td>
                  <td className="py-2.5 px-2.5">
                    <StatusBadge tone={actionTone(item.action)}>
                      {item.action || 'system.event'}
                    </StatusBadge>
                  </td>
                  <td className="py-2.5 px-2.5 font-semibold text-slate-700">
                    {item.entity || 'User'}
                  </td>
                  <td className="py-2.5 px-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-600 select-all">
                      {String(item.entityId || '—').slice(0, 16)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                    <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 font-mono text-[10px] text-slate-500 select-all">
                      {String(item.requestId || '—').slice(0, 18)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No audit events recorded"
            message="Administrative and security actions will be logged here automatically."
          />
        )}
      </TableShell>
    </div>
  );
};

export default AuditLogs;
