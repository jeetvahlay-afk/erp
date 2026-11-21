import { useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CreditCard,
  FileText,
  Printer,
  UserCheck,
} from 'lucide-react';
import { Modal, ToolbarButton, formatCurrency } from './ui/EnterpriseUI';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function numberToWordsIndian(num) {
  num = Math.round(Number(num) || 0);
  if (num === 0) return 'Zero';
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];
  function twoDigit(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : '');
  }
  function threeDigit(n) {
    if (n < 100) return twoDigit(n);
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${twoDigit(n % 100)}` : ''}`;
  }
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;
  const parts = [];
  if (crore) parts.push(`${threeDigit(crore)} Crore`);
  if (lakh) parts.push(`${threeDigit(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigit(thousand)} Thousand`);
  if (hundred) parts.push(threeDigit(hundred));
  return parts.join(' ');
}

function getChequeWords(amountNum) {
  const num = Math.round(Number(amountNum) || 0);
  if (num <= 0) return { line1: 'Zero', line2: '' };
  const fullWords = `${numberToWordsIndian(num)} Only`;
  const words = fullWords.split(' ');
  let line1 = '';
  let line2 = '';
  const maxLen = 42;
  for (let i = 0; i < words.length; i += 1) {
    const next = line1 ? `${line1} ${words[i]}` : words[i];
    if (next.length <= maxLen && !line2) {
      line1 = next;
    } else {
      line2 = line2 ? `${line2} ${words[i]}` : words[i];
    }
  }
  return { line1, line2 };
}

const getTodayChequeDate = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  return `${day}${month}${year}`;
};

export default function SalarySlipModal({ open, onClose, employee, structure = {} }) {
  const now = new Date();
  const [activeTab, setActiveTab] = useState('slip'); // 'slip' | 'cheque'
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [salaryDays, setSalaryDays] = useState(30);
  const [leavesTaken, setLeavesTaken] = useState(0);
  const [allowedLeaves, setAllowedLeaves] = useState(0);
  const [lopDays, setLopDays] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [empPan, setEmpPan] = useState(employee?.pan || 'AAXFV8943Q');
  const [chequeCrossing, setChequeCrossing] = useState('A/C PAYEE ONLY');

  const slipRef = useRef(null);
  const chequeRef = useRef(null);

  const calculations = useMemo(() => {
    const sDays = Number(salaryDays) || 30;
    const lop = Number(lopDays) || 0;
    const paidDays = Math.max(0, sDays - lop);
    const factor = lop > 0 && sDays > 0 ? paidDays / sDays : 1;

    const basic = Math.round(Number(structure.baseSalary || 0) * factor);
    const hra = Math.round(Number(structure.hra || 0) * factor);
    const transport = Math.round(Number(structure.transportAllowance || 0) * factor);
    const security = Math.round(Number(structure.securityAllowance || 0) * factor);
    const otherAllowances = Math.round(Number(structure.otherAllowances || 0) * factor);

    const gross = basic + hra + transport + security + otherAllowances;

    const pf = Number(structure.pfDeduction || 0);
    const tax = Number(structure.taxDeduction || 0);
    const secDeposit = Number(structure.securityDeposit || 0);
    const otherDeductions = Number(structure.otherDeductions || 0);
    const adv = Number(advance) || 0;

    const totalDeductions = pf + tax + secDeposit + otherDeductions + adv;
    const netPay = Math.max(0, gross - totalDeductions);
    const netWords = `${numberToWordsIndian(netPay)} Only`;

    return {
      basic,
      hra,
      transport,
      security,
      otherAllowances,
      gross,
      pf,
      tax,
      secDeposit,
      otherDeductions,
      adv,
      totalDeductions,
      netPay,
      netWords,
      paidDays,
    };
  }, [structure, salaryDays, lopDays, advance]);

  const handlePrint = () => {
    const isSlip = activeTab === 'slip';
    const targetElement = isSlip ? slipRef.current : chequeRef.current;
    if (!targetElement) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((tag) => tag.outerHTML)
      .join('\n');

    const htmlContent = targetElement.outerHTML;
    const title = isSlip
      ? `Salary-Slip-${employee?.name || 'Employee'}-${MONTH_NAMES[month]}-${year}`
      : `Cheque-${employee?.name || 'Payee'}`;

    iframe.contentDocument.open();
    iframe.contentDocument.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          ${styles}
          <style>
            @page {
              size: ${isSlip ? 'A4 portrait' : '202mm 92mm'};
              margin: 0;
            }
            *, *:before, *:after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
              width: ${isSlip ? '210mm' : '202mm'} !important;
              height: ${isSlip ? '297mm' : '92mm'} !important;
              max-height: ${isSlip ? '297mm' : '92mm'} !important;
              overflow: hidden !important;
            }
            .print-wrapper {
              width: ${isSlip ? '210mm' : '202mm'} !important;
              height: ${isSlip ? '297mm' : '92mm'} !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${htmlContent}
          </div>
        </body>
      </html>
    `);
    iframe.contentDocument.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 350);
  };

  if (!employee) return null;

  const chequeWords = getChequeWords(calculations.netPay);
  const chequeDateDigits = getTodayChequeDate().split('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Salary Slip Generator"
      subtitle={`Official verified monthly compensation document for ${employee.name}`}
      size="full"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            Net Payable: <span className="font-bold text-emerald-600">{formatCurrency(calculations.netPay)}</span>
          </div>
          <div className="flex items-center gap-2">
            <ToolbarButton onClick={onClose}>Close</ToolbarButton>
            <ToolbarButton primary icon={Printer} onClick={handlePrint}>
              {activeTab === 'slip' ? 'Print / Export Salary Slip' : 'Print Cheque Leaf'}
            </ToolbarButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top Controls Toolbar */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('slip')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'slip'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileText size={14} />
              Payslip Document
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cheque')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'cheque'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <CreditCard size={14} />
              Cheque Leaf Preview
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>{name}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {[year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Salary Days:</span>
              <input
                type="number"
                min="1"
                max="31"
                value={salaryDays}
                onChange={(e) => setSalaryDays(Math.max(1, Number(e.target.value) || 0))}
                className="w-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">LOP Days:</span>
              <input
                type="number"
                min="0"
                max={salaryDays}
                value={lopDays}
                onChange={(e) => setLopDays(Math.max(0, Number(e.target.value) || 0))}
                className="w-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-rose-600 dark:text-rose-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Leaves:</span>
              <input
                type="number"
                min="0"
                value={leavesTaken}
                onChange={(e) => setLeavesTaken(Math.max(0, Number(e.target.value) || 0))}
                title="Leaves Taken"
                className="w-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-semibold text-slate-800 dark:text-slate-200"
              />
              <span className="text-slate-400">/</span>
              <input
                type="number"
                min="0"
                value={allowedLeaves}
                onChange={(e) => setAllowedLeaves(Math.max(0, Number(e.target.value) || 0))}
                title="Allowed Leaves"
                className="w-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-semibold text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Advance:</span>
              <input
                type="number"
                min="0"
                value={advance}
                onChange={(e) => setAdvance(Math.max(0, Number(e.target.value) || 0))}
                className="w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-semibold text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">PAN:</span>
              <input
                type="text"
                value={empPan}
                onChange={(e) => setEmpPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-mono font-bold text-slate-800 dark:text-slate-200 uppercase"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Official Salary Slip Document View */}
        {activeTab === 'slip' && (
          <div className="overflow-x-auto p-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl flex justify-center">
            <div
              ref={slipRef}
              id="printable-payslip"
              className="w-[794px] min-w-[794px] max-w-[794px] min-h-[1050px] bg-white text-[#1b2a44] font-sans text-xs shadow-md rounded-xl overflow-hidden border border-[#e1d9c4] box-border flex flex-col justify-between"
            >
              {/* Header Band */}
              <div>
                <div className="bg-[#1a2d42] text-white px-8 py-5 flex items-center justify-between border-b-2 border-[#c59a58]">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-white border-2 border-[#c59a58] flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-1">
                      <img
                        src="/auth-logo.png"
                        alt="Company Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold tracking-wider text-white m-0 leading-tight">
                        TEAMHUB ENTERPRISE
                      </h1>
                      <p className="text-[11px] text-[#c7d0de] mt-0.5 mb-0.5 leading-normal font-normal">
                        Corporate Headquarters &bull; Ahmedabad, Gujarat, India
                      </p>
                      <div className="text-[10px] font-bold text-[#dfbe8a] tracking-[0.14em] uppercase">
                        USA &bull; CANADA &bull; BHARAT
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end justify-center">
                    <div className="text-[10px] font-bold text-[#dfbe8a] tracking-[0.12em] uppercase">
                      CONFIDENTIAL PAYSLIP
                    </div>
                    <div className="text-xl font-bold text-white tracking-tight font-sans leading-tight mt-0.5">
                      {MONTH_NAMES[month]} {year}
                    </div>
                    <div className="text-[9.5px] text-[#93a7c1] font-medium tracking-wide mt-0.5 leading-tight">
                      System Generated &bull; Verified Record
                    </div>
                  </div>
                </div>

                {/* Meta Details Table */}
                <table className="w-full border-collapse border-b border-[#e1d9c4] text-xs">
                  <tbody>
                    <tr className="border-b border-[#e8dfcf]">
                      <td className="w-[18%] bg-[#f8f5ee] px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-wider text-[#6b7280]">
                        EMPLOYEE NAME
                      </td>
                      <td className="w-[32%] px-4 py-2.5 font-bold text-[#1a2d42] text-[12.5px] border-r border-[#e8dfcf]">
                        {employee.name}
                      </td>
                      <td className="w-[18%] bg-[#f8f5ee] px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-wider text-[#6b7280]">
                        EMPLOYEE PAN
                      </td>
                      <td className="w-[32%] px-4 py-2.5 font-mono font-bold text-[#1a2d42] text-[12.5px]">
                        {empPan || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-[#f8f5ee] px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-wider text-[#6b7280]">
                        DESIGNATION / DEPT
                      </td>
                      <td className="px-4 py-2.5 font-bold text-[#1a2d42] text-[12.5px] border-r border-[#e8dfcf]">
                        {employee.designation || 'Staff'} &bull; {employee.department || 'General'}
                      </td>
                      <td className="bg-[#f8f5ee] px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-wider text-[#6b7280]">
                        EMPLOYEE ID
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-[#1a2d42] text-[12.5px]">
                        {employee.employeeId || 'Vah0001'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Middle Section: Components, Attendance, Net Pay */}
              <div className="flex-1 flex flex-col justify-between p-6 space-y-6">
                {/* 1. Earnings & Deductions Columns */}
                <div>
                  <div className="grid grid-cols-2 gap-8">
                    {/* Earnings Column */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#9c6928] pb-1.5 border-b-2 border-[#a9772e] mb-3">
                        EARNINGS &amp; ALLOWANCES
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between py-1 text-xs">
                          <span className="text-[#1a2d42] font-medium shrink-0">Basic Payment</span>
                          <span className="flex-1 mx-2 border-b border-dotted border-[#c8bfae] relative -top-0.5" />
                          <span className="font-mono font-semibold text-[#1a2d42] shrink-0">
                            {formatCurrency(calculations.basic)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between py-1 text-xs">
                          <span className="text-[#1a2d42] font-medium shrink-0">House Rent Allowance (HRA)</span>
                          <span className="flex-1 mx-2 border-b border-dotted border-[#c8bfae] relative -top-0.5" />
                          <span className="font-mono font-semibold text-[#1a2d42] shrink-0">
                            {formatCurrency(calculations.hra)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between py-1 text-xs">
                          <span className="text-[#1a2d42] font-medium shrink-0">Transport Allowance</span>
                          <span className="flex-1 mx-2 border-b border-dotted border-[#c8bfae] relative -top-0.5" />
                          <span className="font-mono font-semibold text-[#1a2d42] shrink-0">
                            {formatCurrency(calculations.transport)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between py-1 text-xs">
                          <span className="text-[#1a2d42] font-medium shrink-0">Security Allowance</span>
                          <span className="flex-1 mx-2 border-b border-dotted border-[#c8bfae] relative -top-0.5" />
                          <span className="font-mono font-semibold text-[#1a2d42] shrink-0">
                            {formatCurrency(calculations.security)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between py-1 text-xs">
                          <span className="text-[#1a2d42] font-medium shrink-0">Other Allowances</span>
                          <span className="flex-1 mx-2 border-b border-dotted border-[#c8bfae] relative -top-0.5" />
                          <span className="font-mono font-semibold text-[#1a2d42] shrink-0">
                            {formatCurrency(calculations.otherAllowances)}
                          </span>
                        </div>
                      </div>
                      <div className="pt-2.5 border-t-2 border-[#1a2d42] flex items-center justify-between font-bold mt-4">
                        <span className="text-[#1a2d42] text-[13px]">Total Gross Salary</span>
                        <span className="font-mono text-[#2d7a4f] text-sm">
                          {formatCurrency(calculations.gross)}
                        </span>
                      </div>
                    </div>

                    {/* Deductions Column */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#9c6928] pb-1.5 border-b-2 border-[#a9772e] mb-3">
                        DEDUCTIONS &amp; ADVANCES
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between py-1 text-xs">
                          <span className="text-[#1a2d42] font-medium shrink-0">Contribution to PF</span>
                          <span className="flex-1 mx-2 border-b border-dotted border-[#c8bfae] relative -top-0.5" />
                          <span className="font-mono font-semibold text-[#1a2d42] shrink-0">
                            {formatCurrency(calculations.pf)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between py-1 text-xs">
                          <span className="text-[#1a2d42] font-medium shrink-0">Income Tax Deduction (TDS)</span>
                          <span className="flex-1 mx-2 border-b border-dotted border-[#c8bfae] relative -top-0.5" />
                          <span className="font-mono font-semibold text-[#1a2d42] shrink-0">
                            {formatCurrency(calculations.tax)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between py-1 text-xs">
                          <span className="text-[#1a2d42] font-medium shrink-0">Security Deposit</span>
                          <span className="flex-1 mx-2 border-b border-dotted border-[#c8bfae] relative -top-0.5" />
                          <span className="font-mono font-semibold text-[#1a2d42] shrink-0">
                            {formatCurrency(calculations.secDeposit)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between py-1 text-xs">
                          <span className="text-[#1a2d42] font-medium shrink-0">Other Deductions</span>
                          <span className="flex-1 mx-2 border-b border-dotted border-[#c8bfae] relative -top-0.5" />
                          <span className="font-mono font-semibold text-[#1a2d42] shrink-0">
                            {formatCurrency(calculations.otherDeductions)}
                          </span>
                        </div>
                        {calculations.adv > 0 && (
                          <div className="flex items-baseline justify-between py-1 text-xs">
                            <span className="text-[#1a2d42] font-medium shrink-0">Salary Advance Adjusted</span>
                            <span className="flex-1 mx-2 border-b border-dotted border-[#c8bfae] relative -top-0.5" />
                            <span className="font-mono font-semibold text-[#1a2d42] shrink-0">
                              {formatCurrency(calculations.adv)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="pt-2.5 border-t-2 border-[#1a2d42] flex items-center justify-between font-bold mt-4">
                        <span className="text-[#1a2d42] text-[13px]">Total Deductions</span>
                        <span className="font-mono text-[#a83232] text-sm">
                          {formatCurrency(calculations.totalDeductions)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Attendance Summary Table */}
                <div className="overflow-hidden rounded-lg border border-[#e1d9c4]">
                  <table className="w-full border-collapse text-xs">
                    <tbody>
                      <tr className="border-b border-[#e8dfcf]">
                        <td className="w-[22%] bg-[#f8f5ee] px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-wider text-[#6b7280]">
                          TOTAL SALARY DAYS
                        </td>
                        <td className="w-[28%] px-4 py-2.5 font-mono font-bold text-[#1a2d42] text-[13px] border-r border-[#e8dfcf]">
                          {salaryDays}
                        </td>
                        <td className="w-[22%] bg-[#f8f5ee] px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-wider text-[#6b7280]">
                          DAYS PRESENT / PAID
                        </td>
                        <td className="w-[28%] px-4 py-2.5 font-mono font-bold text-[#226746] text-[13px]">
                          {calculations.paidDays}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-[#f8f5ee] px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-wider text-[#6b7280]">
                          LEAVES TAKEN
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-[#8c2d2d] text-[13px] border-r border-[#e8dfcf]">
                          {leavesTaken} <span className="text-[11px] font-normal text-gray-500 font-sans">(Allowed: {allowedLeaves})</span>
                        </td>
                        <td className="bg-[#f8f5ee] px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-wider text-[#6b7280]">
                          LOSS OF PAY (LOP)
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-[#8c2d2d] text-[13px]">
                          {lopDays} Days
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. Net Pay Highlight Banner */}
                <div className="relative overflow-hidden rounded-xl border border-[#c4ded0] bg-[#eef7f0] px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#226746]" />
                  <div className="pl-2">
                    <strong className="block text-sm sm:text-base font-bold text-[#1a2d42] leading-snug">
                      {calculations.netWords}
                    </strong>
                    <span className="text-[11px] text-[#4d5c6f] mt-1 block leading-tight font-medium">
                      Salary after deductions: {formatCurrency(calculations.gross - calculations.totalDeductions + calculations.adv)} &bull; Advance: {formatCurrency(calculations.adv)}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-[10px] uppercase tracking-wider text-[#226746] font-bold leading-tight">
                      NET SALARY PAYABLE
                    </span>
                    <span className="block text-2xl font-black font-mono text-[#226746] leading-none mt-1">
                      {formatCurrency(calculations.netPay)}
                    </span>
                  </div>
                </div>

                {/* 4. Disbursement Details */}
                <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e8dfcf] text-[10.5px] text-[#556275]">
                  <div className="flex items-center justify-between border-b border-[#e8dfcf] pb-2 mb-2">
                    <span className="font-bold text-[#8a5f22] uppercase tracking-wider text-[10px]">
                      Disbursement &amp; Statutory Compliance Details
                    </span>
                    <span className="text-[10px] font-semibold text-[#226746]">
                      Mode: Electronic Bank Transfer (NEFT/RTGS)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <span className="text-gray-500">Processing Status:</span>{' '}
                      <strong className="text-emerald-700">Verified &amp; Paid</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">Tax Regime:</span>{' '}
                      <strong className="text-gray-800">Standard TDS Withholding</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">Document Validity:</span>{' '}
                      <strong className="text-gray-800">Official Electronic Record</strong>
                    </div>
                  </div>
                </div>

                {/* 5. Signature & Authorisation Block */}
                <div className="pt-4 border-t border-[#e1d9c4] flex items-end justify-between gap-6 text-xs">
                  <div className="text-[#4b5a72] max-w-sm text-xs">
                    <p className="text-[10px] text-[#6b7280] mb-2 leading-relaxed">
                      This is an official system-generated pay slip and does not require a physical stamp.
                    </p>
                    <div className="font-bold text-[#1a2d42] text-[13px]">
                      Authorised by HR / Operations Management
                    </div>
                    <div className="text-[11.5px] font-semibold text-[#8a5f22]">
                      Human Resources Directorate &bull; TeamHub Enterprise
                    </div>
                  </div>

                  <div className="text-center shrink-0">
                    <div className="text-[10px] font-bold text-[#1a2d42] mb-2 uppercase tracking-widest font-sans flex items-center justify-center gap-1">
                      <UserCheck size={14} className="text-emerald-600" />
                      AUTHORISED SIGNATORY
                    </div>
                    <div className="w-44 border-t-2 border-[#1a2d42] mx-auto pt-1.5 text-center">
                      <span className="block font-bold text-[#1a2d42] text-[11.5px] leading-tight">
                        Harshad Prajapati
                      </span>
                      <span className="block text-[10px] text-[#8a5f22] font-semibold leading-tight mt-0.5">
                        Manager &bull; Payroll Administration
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Footer Band */}
              <div className="bg-[#1a2d42] text-[#93a7c1] py-2.5 px-8 flex items-center justify-between text-[9.5px] border-t-2 border-[#c59a58]">
                <div>
                  TeamHub Enterprise &bull; Ahmedabad, Gujarat, India &bull; info@vahlayconsulting.com
                </div>
                <div className="font-semibold text-[#dfbe8a] tracking-wider uppercase">
                  Confidential &bull; System Generated Record &bull; Page 1 of 1
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Cheque Leaf Preview */}
        {activeTab === 'cheque' && (
          <div className="overflow-x-auto p-4 bg-slate-100 dark:bg-slate-950/40 rounded-xl flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-semibold">Crossing Type:</span>
              <select
                value={chequeCrossing}
                onChange={(e) => setChequeCrossing(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold"
              >
                <option value="A/C PAYEE ONLY">A/C PAYEE ONLY</option>
                <option value="NOT NEGOTIABLE">NOT NEGOTIABLE</option>
                <option value="NONE / BEARER">NONE / BEARER</option>
              </select>
            </div>

            <div
              ref={chequeRef}
              className="w-[202mm] h-[92mm] bg-[#fbfdfb] border-2 border-[#718096] rounded-lg shadow-lg relative p-4 font-sans text-slate-800 select-none overflow-hidden shrink-0"
              style={{ minWidth: '202mm', minHeight: '92mm' }}
            >
              {/* Crossing */}
              {chequeCrossing !== 'NONE / BEARER' && (
                <div className="absolute top-4 left-6 -rotate-35 border-t-2 border-b-2 border-slate-900 px-3 py-0.5 text-[11px] font-bold tracking-wider">
                  {chequeCrossing}
                </div>
              )}

              {/* Date Box */}
              <div className="absolute top-4 right-6 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-600">DATE</span>
                <div className="flex gap-1">
                  {chequeDateDigits.map((digit, idx) => (
                    <div
                      key={idx}
                      className="w-5 h-6 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs bg-white"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payee Name */}
              <div className="absolute top-20 left-16 flex items-baseline gap-2 w-[75%]">
                <span className="text-xs font-bold text-slate-700 shrink-0">PAY</span>
                <span className="font-bold text-base tracking-wide border-b border-dotted border-slate-600 flex-1 pl-2">
                  *** {employee.name.toUpperCase()} ***
                </span>
              </div>

              {/* Amount in Words */}
              <div className="absolute top-28 left-16 flex items-baseline gap-2 w-[60%]">
                <span className="text-xs font-bold text-slate-700 shrink-0">RUPEES</span>
                <span className="font-semibold text-xs border-b border-dotted border-slate-600 flex-1 pl-2">
                  *** {chequeWords.line1}
                </span>
              </div>
              {chequeWords.line2 && (
                <div className="absolute top-34 left-16 w-[60%] pl-14">
                  <span className="font-semibold text-xs border-b border-dotted border-slate-600 block">
                    {chequeWords.line2} ***
                  </span>
                </div>
              )}

              {/* Amount in Figures Box */}
              <div className="absolute top-28 right-8 w-44 h-11 border-2 border-slate-800 rounded bg-white flex items-center justify-between px-3">
                <span className="text-lg font-bold text-slate-700">₹</span>
                <span className="font-mono font-bold text-lg text-slate-900 tracking-wider">
                  *** {calculations.netPay.toLocaleString('en-IN')}/- ***
                </span>
              </div>

              {/* Signatory */}
              <div className="absolute bottom-6 right-8 text-right">
                <p className="text-[11px] font-bold text-slate-700">For TeamHub Enterprise</p>
                <div className="h-10" />
                <p className="text-[10px] text-slate-500 border-t border-slate-400 pt-0.5">Authorised Signatory</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
