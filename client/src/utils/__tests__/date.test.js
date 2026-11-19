import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, getLogicalDateString } from '../date';

describe('date utilities', () => {
  it('uses the prior logical workday before the cutoff hour', () => {
    const input = new Date(2026, 6, 17, 5, 30, 0);
    expect(getLogicalDateString(input, 10)).toBe('2026-07-16');
  });

  it('keeps the current logical workday after the cutoff hour', () => {
    const input = new Date(2026, 6, 17, 10, 30, 0);
    expect(getLogicalDateString(input, 10)).toBe('2026-07-17');
  });

  it('handles invalid dates without throwing', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('formats numeric values as currency', () => {
    expect(formatCurrency(25000, 'INR')).toMatch(/25,000/);
  });
});
