// Country codes with flags, dial codes, validation lengths, and regex patterns
export const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳', minDigits: 10, maxDigits: 10, pattern: /^[6-9]\d{9}$/, placeholder: 'Enter phone number' },
  { code: '+1', country: 'United States / Canada', flag: '🇺🇸', minDigits: 10, maxDigits: 10, pattern: /^[2-9]\d{9}$/, placeholder: 'Enter phone number' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧', minDigits: 10, maxDigits: 11, pattern: /^\d{10,11}$/, placeholder: 'Enter phone number' },
  { code: '+971', country: 'UAE', flag: '🇦🇪', minDigits: 9, maxDigits: 9, pattern: /^5\d{8}$/, placeholder: 'Enter phone number' },
  { code: '+61', country: 'Australia', flag: '🇦🇺', minDigits: 9, maxDigits: 9, pattern: /^4\d{8}$/, placeholder: 'Enter phone number' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', minDigits: 8, maxDigits: 8, pattern: /^[89]\d{7}$/, placeholder: 'Enter phone number' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦', minDigits: 9, maxDigits: 9, pattern: /^5\d{8}$/, placeholder: 'Enter phone number' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦', minDigits: 8, maxDigits: 8, pattern: /^[3567]\d{7}$/, placeholder: 'Enter phone number' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼', minDigits: 8, maxDigits: 8, pattern: /^[569]\d{7}$/, placeholder: 'Enter phone number' },
  { code: '+968', country: 'Oman', flag: '🇴🇲', minDigits: 8, maxDigits: 8, pattern: /^[79]\d{7}$/, placeholder: 'Enter phone number' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭', minDigits: 8, maxDigits: 8, pattern: /^[36]\d{7}$/, placeholder: 'Enter phone number' },
  { code: '+49', country: 'Germany', flag: '🇩🇪', minDigits: 10, maxDigits: 11, pattern: /^1[5-7]\d{8,9}$/, placeholder: 'Enter phone number' },
  { code: '+33', country: 'France', flag: '🇫🇷', minDigits: 9, maxDigits: 9, pattern: /^[67]\d{8}$/, placeholder: 'Enter phone number' },
  { code: '+81', country: 'Japan', flag: '🇯🇵', minDigits: 10, maxDigits: 10, pattern: /^[789]0\d{8}$/, placeholder: 'Enter phone number' },
  { code: '+86', country: 'China', flag: '🇨🇳', minDigits: 11, maxDigits: 11, pattern: /^1[3-9]\d{9}$/, placeholder: 'Enter phone number' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵', minDigits: 10, maxDigits: 10, pattern: /^9[78]\d{8}$/, placeholder: 'Enter phone number' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩', minDigits: 10, maxDigits: 10, pattern: /^1[3-9]\d{8}$/, placeholder: 'Enter phone number' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰', minDigits: 9, maxDigits: 9, pattern: /^7\d{8}$/, placeholder: 'Enter phone number' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰', minDigits: 10, maxDigits: 10, pattern: /^3\d{9}$/, placeholder: 'Enter phone number' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾', minDigits: 9, maxDigits: 10, pattern: /^1\d{8,9}$/, placeholder: 'Enter phone number' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭', minDigits: 10, maxDigits: 10, pattern: /^9\d{9}$/, placeholder: 'Enter phone number' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿', minDigits: 9, maxDigits: 10, pattern: /^2\d{7,8}$/, placeholder: 'Enter phone number' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦', minDigits: 9, maxDigits: 9, pattern: /^[6-8]\d{8}$/, placeholder: 'Enter phone number' },
  { code: '+7', country: 'Russia / KZ', flag: '🇷🇺', minDigits: 10, maxDigits: 10, pattern: /^9\d{9}$/, placeholder: 'Enter phone number' },
];

/**
 * Parses any incoming phone number string (e.g. "+91 9876543210", "+1 2025550123", "9876543210")
 * into normalized countryCode and clean national digits.
 */
export const parsePhoneNumber = (rawPhone) => {
  if (!rawPhone) return { countryCode: '+91', phoneNumber: '' };

  const trimmed = String(rawPhone).trim();

  // If starts with +, try matching the longest country code prefix
  if (trimmed.startsWith('+')) {
    // Sort country codes by length descending so +971 is matched before +9
    const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      if (trimmed.startsWith(c.code)) {
        const remainingDigits = trimmed.slice(c.code.length).replace(/\D/g, '');
        return { countryCode: c.code, phoneNumber: remainingDigits };
      }
    }
  }

  // If doesn't start with +, check if it's 10-digit Indian number or has 91 prefix
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return { countryCode: '+91', phoneNumber: digitsOnly.slice(2) };
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return { countryCode: '+91', phoneNumber: digitsOnly.slice(1) };
  }

  // Default to +91 with whatever digits are present
  return { countryCode: '+91', phoneNumber: digitsOnly };
};

/**
 * Validates countryCode and phoneNumber digits.
 * Returns error string or null if valid.
 */
export const validatePhoneNumber = (countryCode, phoneNumber) => {
  const code = countryCode || '+91';
  const digits = String(phoneNumber || '').replace(/\D/g, '');

  if (!digits) {
    return 'Phone Number is required.';
  }

  const country = COUNTRY_CODES.find((c) => c.code === code);

  if (code === '+91') {
    if (!/^[6-9]/.test(digits)) {
      return 'Indian mobile numbers must start with 6, 7, 8, or 9.';
    }
    if (digits.length !== 10) {
      return `Indian mobile number must be exactly 10 digits (${digits.length}/10 entered).`;
    }
    return null;
  }

  if (country) {
    if (country.minDigits === country.maxDigits) {
      if (digits.length !== country.minDigits) {
        return `${country.country} phone number must be ${country.minDigits} digits (${digits.length}/${country.minDigits} entered).`;
      }
    } else {
      if (digits.length < country.minDigits) {
        return `${country.country} phone number requires at least ${country.minDigits} digits (${digits.length}/${country.minDigits} entered).`;
      }
      if (digits.length > country.maxDigits) {
        return `${country.country} phone number cannot exceed ${country.maxDigits} digits.`;
      }
    }
    return null;
  }

  // Generic fallback for any other country
  if (digits.length < 7) {
    return `Phone number must be at least 7 digits (${digits.length}/7 entered).`;
  }
  if (digits.length > 15) {
    return 'Phone number cannot exceed 15 digits.';
  }

  return null;
};
