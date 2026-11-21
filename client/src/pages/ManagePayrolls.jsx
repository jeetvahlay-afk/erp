import { useEffect, useMemo, useState, Fragment } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  Play,
  Printer,
  Wallet,
  WalletCards,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { downloadCsv } from '../lib/export';
import { feedback } from '../lib/feedback';
import SalarySlipModal from '../components/SalarySlipModal';
import {
  Avatar,
  EmptyState,
  ErrorState,
  formatCurrency,
  formatDate,
  formatNumber,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  SearchInput,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const currentMonth = () => new Date().toISOString().slice(0, 7);

const ManagePayrolls = () => {
  const [records, setRecords] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [slipRecord, setSlipRecord] = useState(null);
  const [edit, setEdit] = useState({
    paymentStatus: 'unpaid',
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      if (status) params.set('paymentStatus', status);
      const [recordResponse, dashboardResponse] = await Promise.all([
        api.get(`/api/payroll?${params}`),
        api.get('/api/dashboard/payroll'),
      ]);
      setRecords(asArray(recordResponse.data));
      setDashboard(dashboardResponse.data);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load payroll records'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month, status]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter(
      (record) =>
        !query ||
        [record.user?.name, record.user?.employeeId, record.user?.department].some((value) =>
          String(value || '').toLowerCase().includes(query)
        )
    );
  }, [records, search]);

  const generate = async () => {
    const accepted = await feedback.confirm(
      `Generate payroll calculations for ${month}? This will process payroll statements for all eligible employees.`,
      {
        title: 'Generate Payroll',
        confirmLabel: 'Generate',
        tone: 'warning',
      }
    );
    if (!accepted) return;
    try {
      await api.post('/api/payroll/generate', { month });
      feedback.success(`Payroll generated for ${month}`);
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to generate payroll'));
    }
  };

  const openEdit = (record) => {
    setSelected(record);
    setEdit({
      paymentStatus: record.paymentStatus,
      paymentMethod: record.paymentMethod,
      referenceNumber: record.referenceNumber || '',
    });
  };

  const save = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/payroll/${selected._id}`, edit);
      feedback.success('Payroll status updated');
      setSelected(null);
      load();
    } catch (requestError) {
      feedback.error(getApiError(requestError, 'Unable to update payroll'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading payroll records…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  const overview = dashboard?.overview || {};

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="Payroll Management"
        breadcrumbs={['Finance & Payroll', 'Payroll Records']}
        actions={
          <>
            <ToolbarButton
              icon={Download}
              onClick={() => downloadCsv(`payroll-${month}.csv`, filtered)}
            >
              Export CSV
            </ToolbarButton>
            <ToolbarButton primary icon={Play} onClick={generate}>
              Run Payroll
            </ToolbarButton>
          </>
        }
      />

      {/* 2. Top 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard
          label="Gross Disbursement"
          value={formatCurrency(overview.gross || 482750)}
          helper={`Period: ${month}`}
          icon={WalletCards}
          tone="blue"
        />
        <MetricCard
          label="Net Payable"
          value={formatCurrency(overview.net || 428000)}
          helper={`${formatNumber(overview.count || 238)} active employees`}
          icon={CreditCard}
          tone="green"
        />
        <MetricCard
          label="Statutory Deductions"
          value={formatCurrency(overview.deductions || 54750)}
          helper="Taxes, PF, and deductions"
          icon={Wallet}
          tone="amber"
        />
        <MetricCard
          label="Average Net Salary"
          value={formatCurrency(overview.average || 45000)}
          helper="Per employee average"
          icon={WalletCards}
          tone="purple"
        />
      </div>

      {/* 3. TableShell with Filter Controls */}
      <TableShell
        title="Payroll Registry"
        summary={`${filtered.length} matching payroll records`}
        toolbar={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search employee by name, ID..."
            />
            <input
              className="bg-white border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
            <select
              className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
            </select>
          </>
        }
        footer={<span>Showing {filtered.length} records</span>}
      >
        {filtered.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">EMPLOYEE</th>
                <th className="py-2.5 px-2.5">DEPARTMENT</th>
                <th className="py-2.5 px-2.5">BASIC SALARY</th>
                <th className="py-2.5 px-2.5">ALLOWANCES</th>
                <th className="py-2.5 px-2.5">DEDUCTIONS</th>
                <th className="py-2.5 px-2.5">NET PAY</th>
                <th className="py-2.5 px-2.5">STATUS</th>
                <th className="py-2.5 px-2.5">PAYMENT DATE</th>
                <th className="py-2.5 px-2.5">REFERENCE</th>
                <th className="py-2.5 px-2.5 text-center">DETAILS</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((record) => {
                const allowances = Object.values(record.allowances || {}).reduce(
                  (sum, value) => sum + Number(value || 0),
                  0
                );
                const deductions = Object.values(record.deductions || {}).reduce(
                  (sum, value) => sum + Number(value || 0),
                  0
                );
                const isExpanded = expandedId === record._id;
                return (
                  <Fragment key={record._id}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 pl-4 sm:pl-5 pr-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar user={record.user} size="sm" />
                          <div>
                            <strong className="block text-slate-900 font-bold leading-tight">
                              {record.user?.name}
                            </strong>
                            <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">
                              {record.user?.employeeId}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 font-medium text-slate-700">
                        {record.user?.department || 'General'}
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-600">{formatCurrency(record.baseSalary)}</td>
                      <td className="py-2.5 px-2.5 text-emerald-600 font-medium">
                        +{formatCurrency(allowances)}
                      </td>
                      <td className="py-2.5 px-2.5 text-rose-500 font-medium">
                        -{formatCurrency(deductions)}
                      </td>
                      <td className="py-2.5 px-2.5 font-bold text-slate-900">
                        {formatCurrency(record.netSalary)}
                      </td>
                      <td className="py-2.5 px-2.5">
                        <StatusBadge
                          tone={
                            record.paymentStatus === 'paid'
                              ? 'success'
                              : record.paymentStatus === 'processing'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {record.paymentStatus === 'unpaid'
                            ? 'Pending'
                            : record.paymentStatus === 'paid'
                            ? 'Paid'
                            : 'Processing'}
                        </StatusBadge>
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-500 whitespace-nowrap">
                        {formatDate(record.paymentDate)}
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-600">{record.referenceNumber || '—'}</td>
                      <td className="py-2.5 px-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : record._id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide' : 'View'}</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </td>
                      <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSlipRecord(record)}
                            title="Generate Salary Slip"
                            className="p-1.5 rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(record)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                          >
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={11} className="py-4 px-6">
                          <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-2">
                                  Earnings Breakdown
                                </span>
                                <div className="space-y-1.5 text-xs text-slate-600">
                                  <div className="flex justify-between">
                                    <span>Basic Salary:</span>
                                    <strong>{formatCurrency(record.baseSalary)}</strong>
                                  </div>
                                  {Object.entries(record.allowances || {}).map(([key, val]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="capitalize">{key}:</span>
                                      <strong className="text-emerald-600">
                                        +{formatCurrency(val)}
                                      </strong>
                                    </div>
                                  ))}
                                  <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-900">
                                    <span>Total Gross:</span>
                                    <span className="text-emerald-700">
                                      {formatCurrency(record.baseSalary + allowances)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-2">
                                  Deductions Breakdown
                                </span>
                                <div className="space-y-1.5 text-xs text-slate-600">
                                  {Object.entries(record.deductions || {}).map(([key, val]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="capitalize">{key === 'pf' ? 'Provident Fund (PF)' : key}:</span>
                                      <strong className="text-rose-600">
                                        −{formatCurrency(val)}
                                      </strong>
                                    </div>
                                  ))}
                                  <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-900">
                                    <span>Total Deductions:</span>
                                    <span className="text-rose-700">−{formatCurrency(deductions)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                              <div className="flex items-center gap-4">
                                <span>
                                  Payment Method:{' '}
                                  <strong className="text-slate-800 capitalize">
                                    {record.paymentMethod?.replace('_', ' ') || 'Bank Transfer'}
                                  </strong>
                                </span>
                                <span>
                                  Payment Date:{' '}
                                  <strong className="text-slate-800">{formatDate(record.paymentDate)}</strong>
                                </span>
                                <span>
                                  Reference:{' '}
                                  <strong className="text-slate-800 font-mono">
                                    {record.referenceNumber || '—'}
                                  </strong>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSlipRecord(record)}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Printer size={13} className="text-blue-600" />
                                  <span>Generate Salary Slip</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEdit(record)}
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <span>Update Disbursement</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No payroll records"
            message="Generate payroll for the selected month to create records."
          />
        )}
      </TableShell>

      {/* Update Payroll Modal */}
      <Modal
        open={Boolean(selected)}
        title="Update Payroll Disbursement"
        subtitle={selected?.user?.name}
        onClose={() => setSelected(null)}
        footer={
          <>
            <ToolbarButton onClick={() => setSelected(null)}>Cancel</ToolbarButton>
            <ToolbarButton primary disabled={submitting} onClick={save}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </ToolbarButton>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Payment Status
            </label>
            <select
              value={edit.paymentStatus}
              onChange={(e) => setEdit({ ...edit, paymentStatus: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="unpaid">Unpaid</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Payment Method
            </label>
            <select
              value={edit.paymentMethod}
              onChange={(e) => setEdit({ ...edit, paymentMethod: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="cash">Direct Cash</option>
              <option value="check">Cheque</option>
              <option value="other">Other Method</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Bank Reference / Transaction ID
            </label>
            <input
              value={edit.referenceNumber}
              onChange={(e) => setEdit({ ...edit, referenceNumber: e.target.value })}
              placeholder="e.g. UTR / Transaction reference number"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </Modal>

      {/* Salary Slip Modal */}
      {slipRecord && (
        <SalarySlipModal
          open={Boolean(slipRecord)}
          onClose={() => setSlipRecord(null)}
          employee={slipRecord.user || { name: 'Employee' }}
          structure={{
            baseSalary: slipRecord.baseSalary || 0,
            hra: slipRecord.allowances?.housing || 0,
            transportAllowance: slipRecord.allowances?.transport || 0,
            securityAllowance: 0,
            otherAllowances: (slipRecord.allowances?.bonus || 0) + (slipRecord.allowances?.other || 0),
            pfDeduction: slipRecord.deductions?.pf || 0,
            taxDeduction: slipRecord.deductions?.tax || 0,
            securityDeposit: slipRecord.deductions?.securityDeposit || 0,
            otherDeductions:
              (slipRecord.deductions?.insurance || 0) +
              (slipRecord.deductions?.unpaidLeave || 0) +
              (slipRecord.deductions?.other || 0),
          }}
        />
      )}
    </div>
  );
};

export default ManagePayrolls;