import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Inbox,
  Search,
  Printer,
  Rows3,
  X,
} from 'lucide-react';
import { downloadCsv, downloadExcel } from '../../lib/export';
import WaveLoader from '../common/WaveLoader';

export { WaveLoader };

export const formatNumber = (value = 0) => new Intl.NumberFormat('en-IN').format(Number(value || 0));
export const formatCurrency = (value = 0, currency = 'INR') => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency, maximumFractionDigits: 0,
}).format(Number(value || 0));
export const formatDate = (value, options = {}) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...options }).format(date);
};
export const formatTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
};

export const PageHeader = ({ title, eyebrow: _eyebrow, breadcrumbs: _breadcrumbs = [], actions, children }) => (
  <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3.5 sm:mb-4">
    <div className="min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
      {children}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">{actions}</div>}
  </header>
);

export const Panel = ({ title, subtitle, action, children, className = '', dark = false, noPadding = false, style, ...props }) => (
  <section
    className={`bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden ${dark ? 'bg-slate-900 text-white border-slate-800' : ''} ${className}`.trim()}
    style={style}
    {...props}
  >
    {(title || subtitle || action) && (
      <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          {title && <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>}
          {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.2">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    )}
    <div className={noPadding ? '' : 'p-3.5 sm:p-4'}>{children}</div>
  </section>
);

const TONE_CLASSES = {
  blue: { bg: 'bg-[color-mix(in_srgb,var(--erp-primary,#2563eb)_12%,transparent)]', text: 'text-[var(--erp-primary,#2563eb)]' },
  green: { bg: 'bg-[#ecfdf5] dark:bg-emerald-950/50', text: 'text-[#10b981] dark:text-emerald-400' },
  orange: { bg: 'bg-[#fffbeb] dark:bg-amber-950/50', text: 'text-[#d97706] dark:text-amber-400' },
  amber: { bg: 'bg-[#fffbeb] dark:bg-amber-950/50', text: 'text-[#d97706] dark:text-amber-400' },
  yellow: { bg: 'bg-[#fffbeb] dark:bg-amber-950/50', text: 'text-[#d97706] dark:text-amber-400' },
  red: { bg: 'bg-[#fef2f2] dark:bg-rose-950/50', text: 'text-[#ef4444] dark:text-rose-400' },
  purple: { bg: 'bg-[#f5f3ff] dark:bg-purple-950/50', text: 'text-[#7c3aed] dark:text-purple-400' },
  dark: { bg: 'bg-[color-mix(in_srgb,var(--erp-primary,#2563eb)_12%,transparent)]', text: 'text-[var(--erp-primary,#2563eb)]' },
  navy: { bg: 'bg-[color-mix(in_srgb,var(--erp-primary,#2563eb)_12%,transparent)]', text: 'text-[var(--erp-primary,#2563eb)]' },
  teal: { bg: 'bg-[#f0fdfa] dark:bg-teal-950/50', text: 'text-[#0d9488] dark:text-teal-400' },
};

export const MetricCard = ({ label, value, helper, icon: Icon, tone = 'blue', trend, onClick, className = '' }) => {
  const toneStyle = TONE_CLASSES[tone] || TONE_CLASSES.blue;
  const Wrapper = onClick ? 'button' : 'article';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`bg-white dark:bg-[#111827] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3 text-left transition-all ${
        onClick ? 'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer' : ''
      } ${className}`.trim()}
      aria-label={`${label}: ${value}`}
    >
      {Icon && (
        <div className={`w-10 h-10 rounded-xl ${toneStyle.bg} ${toneStyle.text} flex items-center justify-center shrink-0`}>
          <Icon size={19} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block truncate">{label}</span>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
          {value}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {trend !== undefined && trend !== null && (
            <span className={`inline-flex items-center font-semibold text-[11px] ${Number(trend) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {Number(trend) >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(Number(trend))}%
            </span>
          )}
          {helper && <span className="truncate">{helper}</span>}
        </div>
      </div>
    </Wrapper>
  );
};

export const Avatar = ({ user, size = 'md', className = '' }) => {
  const name = user?.name || user?.candidateName || 'User';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base',
  };
  const currentSize = sizeClasses[size] || sizeClasses.md;

  if (user?.profileImage) {
    const source = /^(https?:|data:|blob:|\/)/.test(user.profileImage) ? user.profileImage : `/api/users/${user._id}/avatar`;
    return <img src={source} alt={name} className={`rounded-full object-cover ring-1 ring-slate-200 shrink-0 ${currentSize} ${className}`} />;
  }
  return (
    <span className={`rounded-full bg-slate-900 text-white font-bold flex items-center justify-center ring-1 ring-slate-200 shrink-0 ${currentSize} ${className}`} aria-hidden="true">
      {initials || 'U'}
    </span>
  );
};

const statusTone = (value = '') => {
  const status = String(value).toLowerCase();
  if (['active', 'approved', 'paid', 'present', 'completed', 'joined', 'selected', 'success'].some((word) => status.includes(word))) return 'success';
  if (['rejected', 'declined', 'inactive', 'absent', 'failed', 'overdue'].some((word) => status.includes(word))) return 'danger';
  if (['pending', 'processing', 'late', 'training', 'scheduled', 'unpaid', 'on leave'].some((word) => status.includes(word))) return 'warning';
  return 'info';
};

export const StatusBadge = ({ children, tone }) => {
  const resolvedTone = tone || statusTone(children);
  const styles = {
    success: 'bg-[#ecfdf5] text-[#059669]',
    warning: 'bg-[#fffbeb] text-[#d97706]',
    danger: 'bg-[#fef2f2] text-[#dc2626]',
    info: 'bg-[#eff6ff] text-[#2563eb]',
  };
  const dotStyles = {
    success: 'bg-[#10b981]',
    warning: 'bg-[#f59e0b]',
    danger: 'bg-[#ef4444]',
    info: 'bg-[#2563eb]',
  };
  const currentStyle = styles[resolvedTone] || styles.info;
  const currentDot = dotStyles[resolvedTone] || dotStyles.info;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${currentStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${currentDot}`} />
      {children}
    </span>
  );
};

export const LoadingState = ({ label = 'Loading live data…', size = 'md' }) => (
  <div className="flex flex-col items-center justify-center p-10 text-slate-400">
    <WaveLoader label={label} size={size} />
  </div>
);

export const EmptyState = ({ title = 'No records found', message = 'There is no data matching the current filters.', action }) => (
  <div className="flex flex-col items-center justify-center p-6 sm:p-7 text-center text-slate-400 gap-1.5">
    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-0.5">
      <Inbox size={18} />
    </div>
    <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h3>
    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">{message}</p>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const ErrorState = ({ message = 'Unable to load this information.', retry }) => (
  <div className="flex flex-col items-center justify-center p-6 sm:p-7 text-center text-slate-500 gap-1.5 bg-rose-50/50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40">
    <AlertCircle className="text-rose-500" size={20} />
    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Data could not be loaded</h3>
    <p className="text-[11px] text-slate-600 dark:text-slate-400 max-w-md">{message}</p>
    {retry && (
      <button
        className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        type="button"
        onClick={retry}
      >
        Try again
      </button>
    )}
  </div>
);

export const DonutChart = ({ segments = [], centerValue, centerLabel, size = 180 }) => {
  const total = segments.reduce((acc, item) => acc + Number(item.value || 0), 0);
  let cursor = 0;
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#7c3aed', '#ec4899', '#0284c7'];
  const gradient = segments.length && total
    ? segments.map((item, index) => {
      const start = (cursor / total) * 360;
      cursor += Number(item.value || 0);
      const end = (cursor / total) * 360;
      return `${item.color || colors[index % colors.length]} ${start}deg ${end}deg`;
    }).join(', ')
    : '#e2e8f0 0deg 360deg';
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative rounded-full flex items-center justify-center shrink-0" style={{ width: size, height: size, background: `conic-gradient(${gradient})` }}>
        <div className="w-[72%] h-[72%] rounded-full bg-white flex flex-col items-center justify-center shadow-xs">
          <strong className="text-xl font-bold text-slate-900">{centerValue ?? total}</strong>
          <span className="text-xs text-slate-500 font-medium">{centerLabel || 'Total'}</span>
        </div>
      </div>
      {segments.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          {segments.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color || colors[index % colors.length] }} />
              <span>{item.label}</span>
              <strong className="text-slate-900">({formatNumber(item.value)})</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const HorizontalBars = ({ data = [], valueKey = 'value', labelKey = 'label', color = '#2563eb' }) => {
  const max = Math.max(1, ...data.map((item) => Number(item[valueKey] || 0)));
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item[labelKey]} className="flex items-center justify-between gap-3 text-xs">
          <span className="w-28 text-slate-600 font-medium truncate">{item[labelKey]}</span>
          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(Number(item[valueKey] || 0) / max) * 100}%`, background: item.color || color }}
            />
          </div>
          <strong className="w-12 text-right text-slate-900 font-bold">{formatNumber(item[valueKey])}</strong>
        </div>
      ))}
    </div>
  );
};

export const ColumnChart = ({ data = [], keys = ['value'], labels, height = 210, minimumScale = 1 }) => {
  const values = data.flatMap((item) => keys.map((key) => Number(item[key] || 0)));
  const max = Math.max(Number(minimumScale || 1), 1, ...values);
  const colors = [
    'var(--erp-primary, #2563eb)',
    '#f59e0b',
    '#ef4444',
    'var(--erp-accent, #0284c7)',
  ];
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2 pt-4 px-2" style={{ height }}>
        {data.map((item, index) => (
          <div className="flex-1 flex flex-col items-center justify-end h-full gap-2" key={`${item.label || item.date}-${index}`}>
            <div className="w-full flex items-end justify-center gap-1 h-full pb-1">
              {keys.map((key, keyIndex) => {
                const value = Number(item[key] || 0);
                const barHeight = value > 0 ? Math.max(4, (value / max) * 100) : 0;
                return (
                  <div
                    key={key}
                    title={`${labels?.[key] || key}: ${value}`}
                    className="w-3 sm:w-4 rounded-t-sm transition-all"
                    style={{ height: `${barHeight}%`, background: colors[keyIndex % colors.length] }}
                  />
                );
              })}
            </div>
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{item.label || item.date}</span>
          </div>
        ))}
      </div>
      {keys.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-600">
          {keys.map((key, index) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[index % colors.length] }} />
              {labels?.[key] || key}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const LineChart = ({ data = [], valueKey = 'value', labelKey = 'label', height = 190 }) => {
  const width = 640;
  const max = Math.max(1, ...data.map((item) => Number(item[valueKey] || 0)));
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : (index / Math.max(1, data.length - 1)) * width;
    const y = height - 16 - ((Number(item[valueKey] || 0) / max) * (height - 36));
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id="erp-line-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--erp-primary, #2563eb)" stopOpacity=".22" />
            <stop offset="1" stopColor="var(--erp-primary, #2563eb)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {data.length > 1 && <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#erp-line-area)" />}
        <polyline points={points} fill="none" stroke="var(--erp-primary, #2563eb)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((item, index) => {
          const [x, y] = points.split(' ')[index].split(',');
          return <circle key={`${item[labelKey]}-${index}`} cx={x} cy={y} r="4" fill="#fff" stroke="var(--erp-primary, #2563eb)" strokeWidth="2.5" />;
        })}
      </svg>
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1 mt-1">
        {data.map((item, index) => <span key={`${item[labelKey]}-${index}`}>{item[labelKey]}</span>)}
      </div>
    </div>
  );
};

export const SearchInput = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
  <div className={`relative flex-1 max-w-md ${className}`}>
    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
        aria-label="Clear search"
      >
        <X size={13} />
      </button>
    )}
  </div>
);

export const TableShell = ({
  title, summary, toolbar, children, footer, className = '', tools = false,
}) => {
  const shellRef = useRef(null);
  const [density, setDensity] = useState('comfortable');

  const rowsFromTable = () => {
    const table = shellRef.current?.querySelector('table');
    if (!table) return [];
    const headers = [...table.querySelectorAll('thead th')].map((cell, index) => cell.textContent.trim() || `Column ${index + 1}`);
    return [...table.querySelectorAll('tbody tr')].map((row) => Object.fromEntries(
      [...row.cells].map((cell, index) => [headers[index] || `Column ${index + 1}`, cell.textContent.trim()]),
    ));
  };

  const exportTable = () => {
    const slug = String(title || 'teamhub-export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    downloadCsv(`${slug || 'teamhub-export'}.csv`, rowsFromTable());
  };

  const exportExcel = () => {
    const slug = String(title || 'teamhub-export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    downloadExcel(`${slug || 'teamhub-export'}-excel`, rowsFromTable());
  };

  const printTable = () => {
    if (!shellRef.current) return;
    shellRef.current.classList.add('erp-print-target');
    window.print();
    window.setTimeout(() => shellRef.current?.classList.remove('erp-print-target'), 50);
  };

  const cycleDensity = () => setDensity((current) => (
    current === 'comfortable' ? 'compact' : current === 'compact' ? 'spacious' : 'comfortable'
  ));

  return (
    <section ref={shellRef} data-table-density={density} className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden ${className}`.trim()}>
      {(title || summary || toolbar || tools) && (
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>}
            {summary && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">{summary}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {toolbar}
            {tools && (
              <div className="flex items-center gap-1.5 ml-auto border-l border-slate-200 dark:border-slate-800 pl-2.5 text-xs">
                <button type="button" onClick={cycleDensity} title={`Density: ${density}`} className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <Rows3 size={13} /><span>{density}</span>
                </button>
                <button type="button" onClick={exportTable} title="Export visible rows to CSV" className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <Download size={13} /><span>CSV</span>
                </button>
                <button type="button" onClick={exportExcel} title="Export visible rows for Excel" className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <FileSpreadsheet size={13} /><span>Excel</span>
                </button>
                <button type="button" onClick={printTable} title="Print or save this table as PDF" className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <Printer size={13} /><span>Print</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
      {footer && <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">{footer}</div>}
    </section>
  );
};

export const Pagination = ({ page, pages, onPage }) => {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="px-2 text-slate-600 dark:text-slate-300 font-semibold">{page} / {pages}</span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

export const Modal = ({
  open, title, subtitle, children, onClose, footer, size = 'lg',
}) => {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = () => [...(dialog?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])') || [])];
    focusable()[0]?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('erp-modal-open');
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('erp-modal-open');
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="erp-modal-title">
      <div className="fixed inset-0" aria-label="Close dialog" onClick={onClose} />
      <section ref={dialogRef} className={`relative bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 w-full ${size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-5xl' : size === '2xl' || size === 'full' ? 'max-w-6xl' : 'max-w-xl'}`}>
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 id="erp-modal-title" className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </header>
        <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">{footer}</footer>}
      </section>
    </div>
  );
};

export const ToolbarButton = ({ icon: Icon, children, primary = false, danger = false, className = '', ...props }) => (
  <button
    type="button"
    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-2xs ${
      primary
        ? 'bg-[#2563eb] hover:bg-blue-700 text-white'
        : danger
        ? 'bg-rose-600 hover:bg-rose-700 text-white'
        : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700'
    } ${className}`.trim()}
    {...props}
  >
    {Icon && <Icon size={15} />}
    {children}
  </button>
);