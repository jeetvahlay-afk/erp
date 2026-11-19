import { useEffect, useMemo, useState, Fragment } from 'react';
import {
  Banknote,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  ReceiptText,
  RotateCcw,
  Umbrella,
  WalletCards,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { downloadCsv } from '../lib/export';
import {
  EmptyState,
  ErrorState,
  formatCurrency,
  formatDate,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusBadge,
  TableShell,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const totalValues = (values = {}) =>
  Object.values(values).reduce((total, value) => total + Number(value || 0), 0);

const MyPayroll = () => {
  const [records, setRecords] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [payrollRes, dashboardRes] = await Promise.all([
        api.get('/api/payroll/my'),
        api.get('/api/dashboard/employee'),
      ]);
      setRecords(asArray(payrollRes.data));
      setBalances(asArray(dashboardRes.data.leaveBalances));
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load payroll statements and balances.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const latest = records[0]?.netSalary || 0;
    const paid = records
      .filter((record) => record.paymentStatus === 'paid')
      .reduce((sum, record) => sum + Number(record.netSalary || 0), 0);
    const deductions = records.reduce((sum, record) => sum + totalValues(record.deductions), 0);
    const securityDeposit = records.reduce(
      (sum, record) => sum + Number(record.deductions?.securityDeposit || 0),
      0
    );

    return {
      latest,
      paid,
      deductions,
      securityDeposit,
      statements: records.length,
    };
  }, [records]);

  const unusedPaidLeaves = useMemo(() => {
    const pLeave = balances.find((b) => b.type === 'Paid Leave');
    return pLeave ? pLeave.remaining : 0;
  }, [balances]);

  const unusedBirthdayLeaves = useMemo(() => {
    const bLeave = balances.find((b) => b.type === 'Birthday Leave');
    return bLeave ? bLeave.remaining : 0;
  }, [balances]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesMonth = !monthFilter || record.month === monthFilter;
      const matchesStatus = !statusFilter || record.paymentStatus === statusFilter;
      return matchesMonth && matchesStatus;
    });
  }, [records, monthFilter, statusFilter]);

  const exportRows = filteredRecords.map((record) => ({
    month: record.month,
    baseSalary: record.baseSalary,
    allowances: totalValues(record.allowances),
    deductions: totalValues(record.deductions),
    netSalary: record.netSalary,
    paymentStatus: record.paymentStatus,
    paymentDate: record.paymentDate || '',
    referenceNumber: record.referenceNumber || '',
  }));

  const resetFilters = () => {
    setMonthFilter('');
    setStatusFilter('');
  };

  if (loading) return <LoadingState label="Loading payroll statements…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="My Payroll"
        breadcrumbs={['Self Service', 'My Payroll']}
        actions={
          <>
            <ToolbarButton
              icon={Download}
              disabled={!filteredRecords.length}
              onClick={() => downloadCsv('my-payroll.csv', exportRows)}
            >
              Export CSV
            </ToolbarButton>
            <ToolbarButton
              primary
              icon={Printer}
              disabled={!filteredRecords.length}
              onClick={() => window.print()}
            >
              Print / PDF
            </ToolbarButton>
          </>
        }
      />

      {/* 2. Primary Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard
          label="Latest Net Salary"
          value={formatCurrency(totals.latest)}
          helper="Most recent disbursement"
          icon={WalletCards}
          tone="blue"
        />
        <MetricCard
          label="Total Paid"
          value={formatCurrency(totals.paid)}
          helper="Across paid statements"
          icon={Banknote}
          tone="green"
        />
        <MetricCard
          label="Total Deductions"
          value={formatCurrency(totals.deductions)}
          helper="Across all statements"
          icon={ReceiptText}
          tone="amber"
        />
        <MetricCard
          label="Disbursed Statements"
          value={totals.statements}
          helper="Payroll months available"
          icon={ReceiptText}
          tone="purple"
        />
      </div>

      {/* 3. Secondary Metrics: Security Deposit & Leave Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
        <MetricCard
          label="Accumulated Deposit"
          value={formatCurrency(totals.securityDeposit)}
          helper="Total security deposit deducted"
          icon={WalletCards}
          tone="blue"
        />
        <MetricCard
          label="Unused Paid Leaves"
          value={unusedPaidLeaves !== null ? `${unusedPaidLeaves} Days` : 'Unlimited'}
          helper="Remaining paid leave balance"
          icon={Umbrella}
          tone="green"
        />
        <MetricCard
          label="Unused Birthday Leaves"
          value={unusedBirthdayLeaves !== null ? `${unusedBirthdayLeaves} Days` : 'Unlimited'}
          helper="Remaining birthday leave balance"
          icon={CalendarDays}
          tone="amber"
        />
      </div>

      {/* 4. Payroll Statements Table */}
      <TableShell
        title="Payroll Statements"
        summary={`${filteredRecords.length} of ${records.length} statements`}
        toolbar={
          <>
            <input
              className="bg-white border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              title="Filter by month"
            />
            <select
              className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="unpaid">Pending Payment</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
            </select>
            {(monthFilter || statusFilter) && (
              <button
                type="button"
                onClick={resetFilters}
                className="border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} className="text-slate-500" />
                <span>Reset</span>
              </button>
            )}
          </>
        }
        footer={<span>Showing {filteredRecords.length} entries</span>}
      >
        {filteredRecords.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 pl-4 sm:pl-5 pr-2.5">PERIOD</th>
                <th className="py-2.5 px-2.5">BASE SALARY</th>
                <th className="py-2.5 px-2.5">ALLOWANCES</th>
                <th className="py-2.5 px-2.5">DEDUCTIONS</th>
                <th className="py-2.5 px-2.5">NET PAY</th>
                <th className="py-2.5 px-2.5">STATUS</th>
                <th className="py-2.5 px-2.5">PAYMENT DATE</th>
                <th className="py-2.5 px-2.5">REFERENCE</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRecords.map((record) => {
                const isExpanded = expandedId === record._id;
                return (
                  <Fragment key={record._id}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 pl-4 sm:pl-5 pr-2.5 font-bold text-slate-900">{record.month}</td>
                      <td className="py-2.5 px-2.5 text-slate-600">
                        {formatCurrency(record.baseSalary)}
                      </td>
                      <td className="py-2.5 px-2.5 text-emerald-600 font-medium">
                        +{formatCurrency(totalValues(record.allowances))}
                      </td>
                      <td className="py-2.5 px-2.5 text-rose-500 font-medium">
                        −{formatCurrency(totalValues(record.deductions))}
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
                      <td className="py-2.5 pr-4 sm:pr-5 pl-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : record._id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide' : 'View'}</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={9} className="py-4 px-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-slate-200/80">
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
                              </div>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-2">
                                Deductions Breakdown
                              </span>
                              <div className="space-y-1.5 text-xs text-slate-600">
                                {Object.entries(record.deductions || {}).map(([key, val]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="capitalize">{key}:</span>
                                    <strong className="text-rose-600">
                                      −{formatCurrency(val)}
                                    </strong>
                                  </div>
                                ))}
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
            title="No payroll statements"
            message="Your payroll statements will appear here once generated by HR."
          />
        )}
      </TableShell>
    </div>
  );
};

export default MyPayroll;