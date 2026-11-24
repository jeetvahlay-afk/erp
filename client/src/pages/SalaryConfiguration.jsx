import { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  CircleDollarSign,
  Printer,
  ReceiptText,
  Save,
  Search,
  Users,
  WalletCards,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import SalarySlipModal from '../components/SalarySlipModal';
import {
  Avatar,
  EmptyState,
  ErrorState,
  formatCurrency,
  LoadingState,
  MetricCard,
  PageHeader,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const emptyStructure = {
  baseSalary: 0,
  hra: 0,
  transportAllowance: 0,
  securityAllowance: 0,
  otherAllowances: 0,
  pfDeduction: 0,
  taxDeduction: 0,
  securityDeposit: 0,
  otherDeductions: 0,
};

const earnings = [
  ['baseSalary', 'Base Salary'],
  ['hra', 'House Rent Allowance (HRA)'],
  ['transportAllowance', 'Transport Allowance'],
  ['securityAllowance', 'Security Allowance'],
  ['otherAllowances', 'Other Allowances'],
];

const deductions = [
  ['pfDeduction', 'Provident Fund (PF)'],
  ['taxDeduction', 'Income Tax Deduction (TDS)'],
  ['securityDeposit', 'Security Deposit'],
  ['otherDeductions', 'Other Deductions'],
];

const SalaryConfiguration = () => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [structure, setStructure] = useState(emptyStructure);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [state, setState] = useState({ loading: true, error: '', saving: false });

  const load = async () => {
    setState({ loading: true, error: '', saving: false });
    try {
      const { data } = await api.get('/api/users');
      setEmployees(asArray(data));
      setState({ loading: false, error: '', saving: false });
    } catch (error) {
      setState({ loading: false, error: getApiError(error, 'Unable to load employees'), saving: false });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const choose = async (employee) => {
    setSelected(employee);
    try {
      const { data } = await api.get(`/api/salary/${employee._id}`);
      setStructure({ ...emptyStructure, ...(data || {}) });
    } catch {
      setStructure({ ...emptyStructure, baseSalary: employee.baseSalary || 0 });
    }
  };

  useEffect(() => {
    if (!selected && employees.length) choose(employees[0]);
  }, [employees, selected]);

  const totals = useMemo(() => {
    const gross = earnings.reduce((sum, [key]) => sum + Number(structure[key] || 0), 0);
    const deduction = deductions.reduce((sum, [key]) => sum + Number(structure[key] || 0), 0);
    return { gross, deduction, net: gross - deduction };
  }, [structure]);

  const save = async () => {
    if (!selected) return;
    setState((current) => ({ ...current, saving: true }));
    try {
      await api.post('/api/salary', { userId: selected._id, ...structure });
      feedback.success('Salary structure saved successfully.');
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to save salary structure'));
    } finally {
      setState((current) => ({ ...current, saving: false }));
    }
  };

  const filtered = employees.filter((employee) =>
    `${employee.name} ${employee.employeeId || ''} ${employee.department || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const updateAmount = (key, value) =>
    setStructure((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));

  if (state.loading) return <LoadingState label="Loading salary structures…" />;
  if (state.error) return <ErrorState message={state.error} retry={load} />;

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      <PageHeader
        title="Salary Configuration"
        breadcrumbs={['Payroll', 'Salary Configuration']}
        actions={
          selected && (
            <div className="flex items-center gap-2">
              <ToolbarButton icon={Printer} onClick={() => setSlipModalOpen(true)}>
                Salary Slip Generator
              </ToolbarButton>
              <ToolbarButton primary icon={Save} disabled={state.saving} onClick={save}>
                {state.saving ? 'Saving…' : 'Save Structure'}
              </ToolbarButton>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-4.5 items-start">
        {/* Left: Employee Directory Selector */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-[680px]">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-600" />
                <span className="font-semibold text-sm text-slate-900">Employees</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">{filtered.length} found</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee name, ID, or department..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No employees match search.</div>
            ) : (
              filtered.map((emp) => {
                const isCurrent = selected?._id === emp._id;
                return (
                  <button
                    type="button"
                    key={emp._id}
                    onClick={() => choose(emp)}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors cursor-pointer ${
                      isCurrent ? 'bg-blue-50/70 border-l-3 border-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Avatar user={emp} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-blue-700' : 'text-slate-900'}`}>
                        {emp.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {emp.employeeId || 'ID Pending'} · {emp.department || 'Unassigned'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Salary Configuration Panels */}
        <div className="lg:col-span-8 space-y-4">
          {selected ? (
            <>
              {/* Selected Employee Summary Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar user={selected} size="md" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{selected.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selected.employeeId || 'Vah0001'} · {selected.department || 'General'} ·{' '}
                      {selected.designation || 'Staff'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Net Take-Home</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(totals.net)}</p>
                  </div>
                  <ToolbarButton icon={Printer} onClick={() => setSlipModalOpen(true)}>
                    Generate Slip
                  </ToolbarButton>
                </div>
              </div>

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard
                  label="Gross Earnings"
                  value={formatCurrency(totals.gross)}
                  helper="Monthly base & allowances"
                  icon={WalletCards}
                  tone="blue"
                />
                <MetricCard
                  label="Total Deductions"
                  value={formatCurrency(totals.deduction)}
                  helper="PF, TDS & security"
                  icon={ReceiptText}
                  tone="red"
                />
                <MetricCard
                  label="Net Monthly Salary"
                  value={formatCurrency(totals.net)}
                  helper="Take-home bank transfer"
                  icon={CircleDollarSign}
                  tone="green"
                />
              </div>

              {/* Earnings & Allowances */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Earnings & Allowances</h3>
                    <p className="text-xs text-slate-500">Components added to the employee's monthly gross.</p>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{formatCurrency(totals.gross)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {earnings.map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">{label}</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={structure[key] || 0}
                          onChange={(e) => updateAmount(key, e.target.value)}
                          className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Statutory & Other Deductions</h3>
                    <p className="text-xs text-slate-500">Amounts subtracted from the gross monthly salary.</p>
                  </div>
                  <span className="text-sm font-bold text-rose-600">{formatCurrency(totals.deduction)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {deductions.map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">{label}</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={structure[key] || 0}
                          onChange={(e) => updateAmount(key, e.target.value)}
                          className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <ToolbarButton primary icon={Save} disabled={state.saving} onClick={save}>
                  {state.saving ? 'Saving Changes…' : 'Save Salary Structure'}
                </ToolbarButton>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs">
              <EmptyState
                title="Select an Employee"
                message="Choose an employee from the left directory to inspect and configure salary components."
                action={<Calculator size={28} className="text-blue-600 mx-auto" />}
              />
            </div>
          )}
        </div>
      </div>

      {selected && (
        <SalarySlipModal
          open={slipModalOpen}
          onClose={() => setSlipModalOpen(false)}
          employee={selected}
          structure={structure}
        />
      )}
    </div>
  );
};

export default SalaryConfiguration;
