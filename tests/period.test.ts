import { describe, expect, it } from 'vitest';
import {
  addMonths,
  assertMonth,
  formatMonth,
  isValidMonth,
  monthRange,
  quarterMonths,
  quarterOf,
  splitMonth,
  ValidationError,
} from '@/lib/period';

describe('month validation', () => {
  it('accepts canonical YYYY-MM', () => {
    expect(isValidMonth('2026-01')).toBe(true);
    expect(isValidMonth('2026-12')).toBe(true);
  });

  it('rejects malformed or out-of-range months', () => {
    for (const bad of ['2026-1', '2026-00', '2026-13', '26-01', '2026/01', '2026-01-15', '', 'January 2026']) {
      expect(isValidMonth(bad), bad).toBe(false);
      expect(() => assertMonth(bad)).toThrow(ValidationError);
    }
  });

  it('names the field in the error message', () => {
    expect(() => assertMonth('nope', 'from')).toThrow(/from must be in YYYY-MM/);
  });
});

describe('monthRange', () => {
  it('is inclusive of both bounds', () => {
    expect(monthRange('2026-01', '2026-03')).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('handles a single month', () => {
    expect(monthRange('2026-07', '2026-07')).toEqual(['2026-07']);
  });

  it('crosses a year boundary', () => {
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('rejects an inverted range', () => {
    expect(() => monthRange('2026-03', '2026-01')).toThrow(/must not be after/);
  });

  it('produces 12 months for a full year', () => {
    expect(monthRange('2026-01', '2026-12')).toHaveLength(12);
  });
});

describe('quarters', () => {
  it('maps months to quarters', () => {
    expect(['2026-01', '2026-03', '2026-04', '2026-09', '2026-10', '2026-12'].map(quarterOf)).toEqual([
      1, 1, 2, 3, 4, 4,
    ]);
  });

  it('expands a quarter to its three months', () => {
    expect(quarterMonths(2026, 1)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(quarterMonths(2026, 4)).toEqual(['2026-10', '2026-11', '2026-12']);
  });

  it('rejects an invalid quarter number', () => {
    expect(() => quarterMonths(2026, 0)).toThrow(ValidationError);
    expect(() => quarterMonths(2026, 5)).toThrow(ValidationError);
  });
});

describe('addMonths', () => {
  it('moves forward and backward across years', () => {
    expect(addMonths('2026-01', 1)).toBe('2026-02');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-06', 12)).toBe('2027-06');
    expect(addMonths('2026-06', -18)).toBe('2024-12');
  });
});

describe('misc', () => {
  it('splits and formats', () => {
    expect(splitMonth('2026-02')).toEqual({ year: 2026, month: 2 });
    expect(formatMonth('2026-02')).toBe('Feb 2026');
  });

  it('orders lexicographically the same as chronologically', () => {
    const months = ['2026-10', '2026-02', '2025-12', '2026-01'];
    expect([...months].sort()).toEqual(['2025-12', '2026-01', '2026-02', '2026-10']);
  });
});
