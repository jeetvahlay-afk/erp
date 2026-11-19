import { describe, expect, it } from 'vitest';
import { asArray, unwrapApiEnvelope } from '../api';

describe('API collection normalization', () => {
  it('preserves an unpaginated array when unwrapping an API envelope', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const response = unwrapApiEnvelope({
      data: {
        success: true,
        message: 'Request completed successfully',
        data: rows,
        pagination: null,
        meta: { requestId: 'test-request' },
      },
    });
    expect(response.data).toEqual(rows);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('accepts plain collection responses', () => {
    const rows = [{ id: 1 }];
    expect(asArray(rows)).toBe(rows);
  });

  it('accepts paginated collection responses', () => {
    const rows = [{ id: 1 }];
    expect(asArray({ items: rows, pagination: { page: 1 } })).toBe(rows);
  });

  it('accepts complete API envelopes', () => {
    const rows = [{ id: 1 }];
    expect(asArray({ success: true, data: rows })).toBe(rows);
    expect(asArray({ success: true, data: { items: rows } })).toBe(rows);
    expect(asArray({ data: { success: true, data: { items: rows } } })).toBe(rows);
  });

  it('turns missing or malformed collections into an empty array', () => {
    expect(asArray(null)).toEqual([]);
    expect(asArray({ data: 'invalid' })).toEqual([]);
  });
});
