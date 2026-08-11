import { describe, expect, it } from 'vitest';
import { formatCurrency, formatPercent, formatSignedCurrency, fromCents, toCents } from '@/lib/money';
import { ValidationError } from '@/lib/period';

describe('toCents', () => {
  it('converts major units to integer cents', () => {
    expect(toCents(5000)).toBe(500000);
    expect(toCents('4800')).toBe(480000);
    expect(toCents('4,800.55')).toBe(480055);
    expect(toCents(0)).toBe(0);
  });

  it('rounds to the nearest cent rather than truncating', () => {
    expect(toCents(10.005)).toBe(1001);
    expect(toCents(0.014)).toBe(1);
  });

  it('avoids float drift on values that lose precision in binary', () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1) + toCents(0.2)).toBe(30);
  });

  it('rejects non-numeric and negative input', () => {
    expect(() => toCents('abc')).toThrow(ValidationError);
    expect(() => toCents('')).toThrow(ValidationError);
    expect(() => toCents(-1)).toThrow(/must not be negative/);
    expect(() => toCents(Infinity)).toThrow(ValidationError);
  });

  it('round-trips through fromCents', () => {
    expect(fromCents(toCents('1234.56'))).toBe(1234.56);
  });
});

describe('formatting', () => {
  it('formats currency', () => {
    expect(formatCurrency(500000)).toBe('$5,000.00');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('signs variance amounts with a real minus sign', () => {
    expect(formatSignedCurrency(50000)).toBe('+$500.00');
    expect(formatSignedCurrency(-20000)).toBe('−$200.00');
    expect(formatSignedCurrency(0)).toBe('$0.00');
  });

  it('renders a null variance % as N/A instead of NaN', () => {
    expect(formatPercent(null)).toBe('N/A');
  });

  it('formats variance % to two decimals', () => {
    expect(formatPercent(-4)).toBe('−4.00%');
    expect(formatPercent(2.5)).toBe('+2.50%');
    expect(formatPercent(0)).toBe('0.00%');
    expect(formatPercent(-100)).toBe('−100.00%');
  });
});
