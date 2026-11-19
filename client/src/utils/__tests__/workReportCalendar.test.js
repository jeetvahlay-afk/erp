import { describe, expect, it } from 'vitest';
import { monthCalendar } from '../workReportCalendar';

describe('work report calendar', () => {
  it('locks only future dates in the current month', () => {
    const now = new Date(2026, 6, 15, 12);
    const days = monthCalendar(now, now);
    expect(days.filter(Boolean)).toHaveLength(31);
    expect(days.find((day) => day?.day === 15).future).toBe(false);
    expect(days.find((day) => day?.day === 16).future).toBe(true);
  });
});
