import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, Clock, RotateCcw } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getTodayIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDatePill = (isoString) => {
  if (!isoString) return '';
  const [y, m, d] = isoString.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return isoString;
  return dateObj.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const DashboardDateSelector = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const currentDateIso = value || getTodayIso();
  const [currY, currM, currD] = currentDateIso.split('-').map(Number);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Quick preset helper
  const handlePreset = (type) => {
    const now = new Date();
    if (type === 'today') {
      onChange(getTodayIso());
    } else if (type === 'yesterday') {
      now.setDate(now.getDate() - 1);
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    } else if (type === 'startOfMonth') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      onChange(`${y}-${m}-01`);
    }
    setOpen(false);
  };

  // Change Year or Month
  const handleYearMonthChange = (newYear, newMonthIndex) => {
    const y = Number(newYear);
    const m = Number(newMonthIndex);
    // Find valid max days for this month/year
    const maxDays = new Date(y, m + 1, 0).getDate();
    const clampedDay = Math.min(currD || 1, maxDays);
    const mStr = String(m + 1).padStart(2, '0');
    const dStr = String(clampedDay).padStart(2, '0');
    onChange(`${y}-${mStr}-${dStr}`);
  };

  // Generate Year range (from 2020 to 2030)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let yr = 2020; yr <= Math.max(currentYear + 2, 2030); yr += 1) {
    years.push(yr);
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
        title="Click to change date or year"
      >
        <Calendar size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="tabular-nums">{formatDatePill(currentDateIso)}</span>
        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-blue-500' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-3.5 space-y-3.5 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
              <Clock size={13} className="text-blue-600" />
              <span>Select Date & Year</span>
            </span>
            <button
              type="button"
              onClick={() => handlePreset('today')}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={11} />
              <span>Today</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Quick Select
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handlePreset('today')}
                className={`py-1.5 px-2 rounded-lg font-medium text-center transition-colors cursor-pointer text-xs ${
                  currentDateIso === getTodayIso()
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePreset('yesterday')}
                className="py-1.5 px-2 rounded-lg font-medium text-center bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handlePreset('startOfMonth')}
                className="py-1.5 px-2 rounded-lg font-medium text-center bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
              >
                1st of Month
              </button>
            </div>
          </div>

          {/* Year & Month Selection */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Jump to Year & Month
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Month</label>
                <select
                  value={currM - 1}
                  onChange={(e) => handleYearMonthChange(currY, e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Year</label>
                <select
                  value={currY}
                  onChange={(e) => handleYearMonthChange(e.target.value, currM - 1)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {years.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Exact Date Picker */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Exact Calendar Date
            </span>
            <input
              type="date"
              value={currentDateIso}
              onChange={(e) => {
                if (e.target.value) {
                  onChange(e.target.value);
                  setOpen(false);
                }
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
            />
          </div>

          <div className="pt-1 flex items-center justify-end border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardDateSelector;
