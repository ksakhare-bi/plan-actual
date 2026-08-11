import { describe, expect, it } from 'vitest';
import { parseActualsCsv, toCsv } from '@/lib/csv';

const KNOWN = ['Marketing', 'Payroll', 'Tools'];

describe('parseActualsCsv', () => {
  it('parses the sample file from the assignment', () => {
    const { rows, errors } = parseActualsCsv(
      ['month,category,amount', '2026-01,Marketing,4800', '2026-01,Payroll,20500', '2026-02,Payroll,19800'].join('\n'),
      KNOWN,
    );
    expect(errors).toEqual([]);
    expect(rows.map((r) => [r.month, r.category, r.amountCents])).toEqual([
      ['2026-01', 'Marketing', 480000],
      ['2026-01', 'Payroll', 2050000],
      ['2026-02', 'Payroll', 1980000],
    ]);
  });

  it('rejects an invalid month format with its line number', () => {
    const { rows, errors } = parseActualsCsv('month,category,amount\n2026-1,Marketing,100', KNOWN);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ line: 2 });
    expect(errors[0].message).toMatch(/Invalid month "2026-1"/);
  });

  it('rejects an unknown category', () => {
    const { errors } = parseActualsCsv('month,category,amount\n2026-01,Rocketry,100', KNOWN);
    expect(errors[0].message).toMatch(/Unknown category "Rocketry"/);
  });

  it('matches known categories case- and whitespace-insensitively, storing the canonical name', () => {
    const { rows, errors } = parseActualsCsv('month,category,amount\n2026-01,  marketing ,100', KNOWN);
    expect(errors).toEqual([]);
    expect(rows[0].category).toBe('Marketing');
  });

  it('rejects non-numeric and negative amounts', () => {
    const { rows, errors } = parseActualsCsv(
      ['month,category,amount', '2026-01,Marketing,abc', '2026-01,Payroll,-5', '2026-02,Payroll,10'].join('\n'),
      KNOWN,
    );
    expect(rows).toHaveLength(1);
    expect(errors.map((e) => e.line)).toEqual([2, 3]);
    expect(errors[0].message).toMatch(/Invalid amount/);
    expect(errors[1].message).toMatch(/must not be negative/);
  });

  it('reports a missing required header column and parses no rows', () => {
    const { rows, errors } = parseActualsCsv('month,amount\n2026-01,100', KNOWN);
    expect(rows).toEqual([]);
    expect(errors[0].message).toMatch(/missing required column\(s\): category/);
  });

  it('accepts columns in any order and ignores extras', () => {
    const { rows, errors } = parseActualsCsv('amount,extra,category,month\n4800,x,Marketing,2026-01', KNOWN);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ month: '2026-01', category: 'Marketing', amountCents: 480000 });
  });

  it('reads an optional note column', () => {
    const { rows } = parseActualsCsv('month,category,amount,note\n2026-01,Marketing,4800,Q1 campaign', KNOWN);
    expect(rows[0].note).toBe('Q1 campaign');
  });

  it('handles quoted fields, embedded commas, BOM and CRLF', () => {
    const { rows, errors } = parseActualsCsv(
      '﻿month,category,amount,note\r\n2026-01,Marketing,"4,800","Agency, retainer"\r\n',
      KNOWN,
    );
    expect(errors).toEqual([]);
    expect(rows[0].amountCents).toBe(480000);
    expect(rows[0].note).toBe('Agency, retainer');
  });

  it('strips currency symbols and skips blank lines', () => {
    const { rows, errors } = parseActualsCsv('month,category,amount\n\n2026-01,Marketing,$4800\n\n', KNOWN);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].amountCents).toBe(480000);
  });

  it('keeps decimal precision as cents', () => {
    const { rows } = parseActualsCsv('month,category,amount\n2026-01,Marketing,4800.55', KNOWN);
    expect(rows[0].amountCents).toBe(480055);
  });

  it('errors on an empty file', () => {
    expect(parseActualsCsv('', KNOWN).errors[0].message).toMatch(/empty/);
  });

  it('skips category validation when no known list is supplied', () => {
    const { rows, errors } = parseActualsCsv('month,category,amount\n2026-01,Anything,10');
    expect(errors).toEqual([]);
    expect(rows[0].category).toBe('Anything');
  });
});

describe('toCsv', () => {
  it('quotes fields containing commas, quotes and newlines', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'he said "hi"']])).toBe('a,b\r\n"x,y","he said ""hi"""\r\n');
  });

  it('renders null as an empty field', () => {
    expect(toCsv(['a', 'b'], [[1, null]])).toBe('a,b\r\n1,\r\n');
  });
});
