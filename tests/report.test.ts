

import { describe, expect, it } from 'vitest';
import { buildReport, computeVariance, computeVariancePct } from '@/lib/report';

const cents = (n: number) => Math.round(n * 100);

const CATEGORIES = [
  { id: 'mkt', name: 'Marketing' },
  { id: 'pay', name: 'Payroll' },
];

describe('computeVariancePct', () => {
  it('is (actual − plan) / plan × 100', () => {
    expect(computeVariancePct(cents(5000), cents(4800))).toBeCloseTo(-4, 10);
    expect(computeVariancePct(cents(20000), cents(20500))).toBeCloseTo(2.5, 10);
    expect(computeVariancePct(cents(20000), cents(19800))).toBeCloseTo(-1, 10);
  });

  it('returns null when plan is 0 instead of NaN or Infinity', () => {
    expect(computeVariancePct(0, cents(250))).toBeNull();
    expect(computeVariancePct(0, 0)).toBeNull();
  });

  it('is −100% when the actual is zero against a non-zero plan', () => {
    expect(computeVariancePct(cents(5000), 0)).toBe(-100);
  });

  it('is 0 when actual equals plan', () => {
    expect(computeVariance(cents(20000), cents(20000))).toEqual({ varianceCents: 0, variancePct: 0 });
  });
});

describe('buildReport — assignment sample data', () => {
  const report = buildReport({
    from: '2026-01',
    to: '2026-02',
    categories: CATEGORIES,
    plans: [
      { categoryId: 'mkt', month: '2026-01', amountCents: cents(5000) },
      { categoryId: 'pay', month: '2026-01', amountCents: cents(20000) },
      { categoryId: 'mkt', month: '2026-02', amountCents: cents(5000) },
      { categoryId: 'pay', month: '2026-02', amountCents: cents(20000) },
    ],
    
    actuals: [
      { categoryId: 'mkt', month: '2026-01', amountCents: cents(4800) },
      { categoryId: 'pay', month: '2026-01', amountCents: cents(20500) },
      { categoryId: 'pay', month: '2026-02', amountCents: cents(19800) },
    ],
  });

  const cell = (categoryId: string, month: string) =>
    report.rows.find((r) => r.categoryId === categoryId && r.month === month)!;

  it('reproduces every row of the sample table', () => {
    expect([
      cell('mkt', '2026-01'),
      cell('pay', '2026-01'),
      cell('mkt', '2026-02'),
      cell('pay', '2026-02'),
    ].map((r) => [r.month, r.categoryName, r.planCents, r.actualCents, r.varianceCents, r.variancePct])).toEqual([
      ['2026-01', 'Marketing', cents(5000), cents(4800), cents(-200), -4],
      ['2026-01', 'Payroll', cents(20000), cents(20500), cents(500), 2.5],
      ['2026-02', 'Marketing', cents(5000), 0, cents(-5000), -100],
      ['2026-02', 'Payroll', cents(20000), cents(19800), cents(-200), -1],
    ]);
  });

  it('flags the missing actual while still reporting it as zero', () => {
    expect(cell('mkt', '2026-02').hasActualEntries).toBe(false);
    expect(cell('mkt', '2026-02').actualCents).toBe(0);
    expect(cell('mkt', '2026-01').hasActualEntries).toBe(true);
  });

  it('totals the range', () => {
    expect(report.totals.planCents).toBe(cents(50000));
    expect(report.totals.actualCents).toBe(cents(45100));
    expect(report.totals.varianceCents).toBe(cents(-4900));
    expect(report.totals.variancePct).toBeCloseTo(-9.8, 10);
  });

  it('summarizes by month', () => {
    expect(report.byMonth.map((m) => [m.month, m.planCents, m.actualCents, m.varianceCents])).toEqual([
      ['2026-01', cents(25000), cents(25300), cents(300)],
      ['2026-02', cents(25000), cents(19800), cents(-5200)],
    ]);
  });

  it('summarizes by category', () => {
    expect(report.byCategory.map((c) => [c.categoryName, c.planCents, c.actualCents])).toEqual([
      ['Marketing', cents(10000), cents(4800)],
      ['Payroll', cents(40000), cents(40300)],
    ]);
  });
});

describe('buildReport — aggregation behaviour', () => {
  it('sums multiple actual entries in the same cell', () => {
    const report = buildReport({
      from: '2026-03',
      to: '2026-03',
      categories: CATEGORIES,
      plans: [{ categoryId: 'mkt', month: '2026-03', amountCents: cents(5000) }],
      actuals: [
        { categoryId: 'mkt', month: '2026-03', amountCents: cents(3000) },
        { categoryId: 'mkt', month: '2026-03', amountCents: cents(1500) },
      ],
    });
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0].actualCents).toBe(cents(4500));
    expect(report.rows[0].varianceCents).toBe(cents(-500));
    expect(report.rows[0].variancePct).toBeCloseTo(-10, 10);
  });

  it('reports a plan = 0 cell with actual spend as variance % N/A, not NaN', () => {
    const report = buildReport({
      from: '2026-03',
      to: '2026-03',
      categories: [{ id: 'tools', name: 'Tools' }],
      plans: [{ categoryId: 'tools', month: '2026-03', amountCents: 0 }],
      actuals: [{ categoryId: 'tools', month: '2026-03', amountCents: cents(250) }],
    });
    expect(report.rows[0].varianceCents).toBe(cents(250));
    expect(report.rows[0].variancePct).toBeNull();
    expect(Number.isNaN(report.rows[0].variancePct as number)).toBe(false);
  });

  it('includes actual-only cells (spend with no target)', () => {
    const report = buildReport({
      from: '2026-01',
      to: '2026-01',
      categories: CATEGORIES,
      plans: [],
      actuals: [{ categoryId: 'mkt', month: '2026-01', amountCents: cents(900) }],
    });
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0].planCents).toBe(0);
    expect(report.rows[0].variancePct).toBeNull();
  });

  it('ignores rows outside the requested range', () => {
    const report = buildReport({
      from: '2026-01',
      to: '2026-01',
      categories: CATEGORIES,
      plans: [{ categoryId: 'mkt', month: '2026-05', amountCents: cents(1000) }],
      actuals: [{ categoryId: 'mkt', month: '2025-12', amountCents: cents(1000) }],
    });
    expect(report.rows).toHaveLength(0);
    expect(report.totals.planCents).toBe(0);
  });

  it('drops rows whose category the user does not own', () => {
    const report = buildReport({
      from: '2026-01',
      to: '2026-01',
      categories: CATEGORIES,
      plans: [{ categoryId: 'someone-elses', month: '2026-01', amountCents: cents(1000) }],
      actuals: [],
    });
    expect(report.rows).toHaveLength(0);
  });

  it('emits an empty month row for months with no data, so the chart has a continuous axis', () => {
    const report = buildReport({
      from: '2026-01',
      to: '2026-03',
      categories: CATEGORIES,
      plans: [{ categoryId: 'mkt', month: '2026-01', amountCents: cents(100) }],
      actuals: [],
    });
    expect(report.byMonth.map((m) => m.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(report.byMonth[1]).toMatchObject({ planCents: 0, actualCents: 0, varianceCents: 0, variancePct: null });
  });

  it('marks locked months on rows and monthly totals', () => {
    const report = buildReport({
      from: '2026-01',
      to: '2026-02',
      categories: CATEGORIES,
      plans: [
        { categoryId: 'mkt', month: '2026-01', amountCents: cents(100) },
        { categoryId: 'mkt', month: '2026-02', amountCents: cents(100) },
      ],
      actuals: [],
      lockedMonths: ['2026-01'],
    });
    expect(report.rows.find((r) => r.month === '2026-01')!.locked).toBe(true);
    expect(report.rows.find((r) => r.month === '2026-02')!.locked).toBe(false);
    expect(report.byMonth[0].locked).toBe(true);
  });

  it('sorts rows by category then month', () => {
    const report = buildReport({
      from: '2026-01',
      to: '2026-02',
      categories: CATEGORIES,
      plans: [
        { categoryId: 'pay', month: '2026-02', amountCents: 1 },
        { categoryId: 'mkt', month: '2026-02', amountCents: 1 },
        { categoryId: 'pay', month: '2026-01', amountCents: 1 },
        { categoryId: 'mkt', month: '2026-01', amountCents: 1 },
      ],
      actuals: [],
    });
    expect(report.rows.map((r) => `${r.categoryName} ${r.month}`)).toEqual([
      'Marketing 2026-01',
      'Marketing 2026-02',
      'Payroll 2026-01',
      'Payroll 2026-02',
    ]);
  });
});
