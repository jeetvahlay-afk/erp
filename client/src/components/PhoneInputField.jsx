import { AlertCircle, Check } from 'lucide-react';
import { COUNTRY_CODES, parsePhoneNumber, validatePhoneNumber } from '../constants/countryCodes';

export const PhoneInputField = ({
  countryCode = '+91',
  phoneNumber = '',
  onCountryCodeChange,
  onPhoneNumberChange,
  onBlur,
  error,
  touched,
  label = 'Phone Number',
  required = true,
  disabled = false,
  placeholder = 'Enter phone number',
  containerClassName = '',
}) => {
  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];
  const digitsOnly = String(phoneNumber || '').replace(/\D/g, '');
  const isComplete = !validatePhoneNumber(countryCode, digitsOnly);
  const showError = Boolean(touched && error);

  const handleInputChange = (e) => {
    const raw = e.target.value;

    // Check if user pasted a number with country code (starts with + or contains country prefix)
    if (raw.startsWith('+')) {
      const parsed = parsePhoneNumber(raw);
      if (onCountryCodeChange && parsed.countryCode) {
        onCountryCodeChange(parsed.countryCode);
      }
      if (onPhoneNumberChange) {
        const country = COUNTRY_CODES.find((c) => c.code === parsed.countryCode) || selectedCountry;
        onPhoneNumberChange(parsed.phoneNumber.slice(0, country.maxDigits));
      }
      return;
    }

    // Clean digits only
    const digits = raw.replace(/\D/g, '');
    const max = selectedCountry.maxDigits || 15;
    const truncated = digits.slice(0, max);

    if (onPhoneNumberChange) {
      onPhoneNumberChange(truncated);
    }
  };

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    if (onCountryCodeChange) {
      onCountryCodeChange(newCode);
    }
    // Re-truncate if new country has shorter max digits
    const targetCountry = COUNTRY_CODES.find((c) => c.code === newCode) || selectedCountry;
    if (digitsOnly.length > targetCountry.maxDigits && onPhoneNumberChange) {
      onPhoneNumberChange(digitsOnly.slice(0, targetCountry.maxDigits));
    }
  };

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1 text-xs">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        className={`flex items-stretch rounded-lg border transition-all shadow-2xs ${
          showError
            ? 'border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/15'
            : isComplete && digitsOnly.length > 0
            ? 'border-emerald-500/60 dark:border-emerald-500/50 bg-emerald-50/10'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20'
        }`}
      >
        {/* Country Code Selector */}
        <div className="relative flex items-center shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 rounded-l-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <select
            value={countryCode}
            onChange={handleCodeChange}
            disabled={disabled}
            aria-label="Country Code"
            className="h-full pl-2.5 pr-6 py-2 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer appearance-none z-10"
          >
            {COUNTRY_CODES.map((item) => (
              <option key={item.code} value={item.code} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                {item.flag} {item.code} ({item.country})
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 text-[10px] text-slate-400">▼</span>
        </div>

        {/* Phone Digits Input */}
        <div className="relative flex-1 flex items-center">
          <input
            type="tel"
            inputMode="numeric"
            disabled={disabled}
            value={digitsOnly}
            onChange={handleInputChange}
            onBlur={onBlur}
            placeholder={placeholder || 'Enter phone number'}
            className="w-full h-full bg-transparent px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none tracking-wide"
          />

          {/* Status badge / Digit counter */}
          <div className="pr-2.5 flex items-center gap-1.5 shrink-0 pointer-events-none select-none">
            {isComplete && digitsOnly.length > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Check size={11} strokeWidth={3} />
              </span>
            )}
            <span
              className={`text-[10px] font-mono font-medium ${
                digitsOnly.length === 0
                  ? 'text-slate-400'
                  : isComplete
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {digitsOnly.length}/{selectedCountry.maxDigits}
            </span>
          </div>
        </div>
      </div>

      {showError && (
        <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1 animate-fadeIn">
          <AlertCircle size={12} className="flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default PhoneInputField;
