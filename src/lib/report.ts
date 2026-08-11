

import { monthRange } from './period';

export interface PlanRow {
  categoryId: string;
  month: string;
  amountCents: number;
}

export interface ActualRow {
  categoryId: string;
  month: string;
  amountCents: number;
  
  entryCount?: number;
}

export interface CategoryRef {
  id: string;
  name: string;
}

export interface ReportCell {
  categoryId: string;
  categoryName: string;
  month: string;
  planCents: number;
  actualCents: number;
  
  hasActualEntries: boolean;
  
  varianceCents: number;
  
  variancePct: number | null;
  locked: boolean;
}

export interface ReportTotals {
  planCents: number;
  actualCents: number;
  varianceCents: number;
  variancePct: number | null;
}

export interface MonthlyTotal extends ReportTotals {
  month: string;
  locked: boolean;
}

export interface CategoryTotal extends ReportTotals {
  categoryId: string;
  categoryName: string;
}

export interface Report {
  from: string;
  to: string;
  months: string[];
  rows: ReportCell[];
  byMonth: MonthlyTotal[];
  byCategory: CategoryTotal[];
  totals: ReportTotals;
}


export function computeVariancePct(planCents: number, actualCents: number): number | null {
  if (planCents === 0) return null;
  return ((actualCents - planCents) / planCents) * 100;
}

export function computeVariance(planCents: number, actualCents: number): {
  varianceCents: number;
  variancePct: number | null;
} {
  return {
    varianceCents: actualCents - planCents,
    variancePct: computeVariancePct(planCents, actualCents),
  };
}

function summarize(planCents: number, actualCents: number): ReportTotals {
  return { planCents, actualCents, ...computeVariance(planCents, actualCents) };
}

const key = (categoryId: string, month: string) => `${categoryId}|${month}`;


export function buildReport(input: {
  from: string;
  to: string;
  categories: CategoryRef[];
  plans: PlanRow[];
  actuals: ActualRow[];
  lockedMonths?: string[];
}): Report {
  const { from, to, categories, plans, actuals } = input;
  const months = monthRange(from, to);
  const inRange = new Set(months);
  const locked = new Set(input.lockedMonths ?? []);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const planByCell = new Map<string, number>();
  for (const p of plans) {
    if (!inRange.has(p.month)) continue;
    planByCell.set(key(p.categoryId, p.month), (planByCell.get(key(p.categoryId, p.month)) ?? 0) + p.amountCents);
  }

  
  
  const actualByCell = new Map<string, { cents: number; count: number }>();
  for (const a of actuals) {
    if (!inRange.has(a.month)) continue;
    const k = key(a.categoryId, a.month);
    const prev = actualByCell.get(k) ?? { cents: 0, count: 0 };
    actualByCell.set(k, { cents: prev.cents + a.amountCents, count: prev.count + (a.entryCount ?? 1) });
  }

  const cellKeys = new Set<string>([...planByCell.keys(), ...actualByCell.keys()]);

  const rows: ReportCell[] = [];
  for (const k of cellKeys) {
    const [categoryId, month] = k.split('|');
    const name = categoryName.get(categoryId);
    if (name === undefined) continue; 
    const planCents = planByCell.get(k) ?? 0;
    const actual = actualByCell.get(k);
    const actualCents = actual?.cents ?? 0;
    rows.push({
      categoryId,
      categoryName: name,
      month,
      planCents,
      actualCents,
      hasActualEntries: (actual?.count ?? 0) > 0,
      ...computeVariance(planCents, actualCents),
      locked: locked.has(month),
    });
  }

  
  rows.sort((a, b) => a.categoryName.localeCompare(b.categoryName) || a.month.localeCompare(b.month));

  const byMonth: MonthlyTotal[] = months.map((month) => {
    const cells = rows.filter((r) => r.month === month);
    const plan = cells.reduce((s, r) => s + r.planCents, 0);
    const act = cells.reduce((s, r) => s + r.actualCents, 0);
    return { month, locked: locked.has(month), ...summarize(plan, act) };
  });

  const byCategory: CategoryTotal[] = [...new Set(rows.map((r) => r.categoryId))]
    .map((categoryId) => {
      const cells = rows.filter((r) => r.categoryId === categoryId);
      const plan = cells.reduce((s, r) => s + r.planCents, 0);
      const act = cells.reduce((s, r) => s + r.actualCents, 0);
      return {
        categoryId,
        categoryName: cells[0].categoryName,
        ...summarize(plan, act),
      };
    })
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  const totals = summarize(
    rows.reduce((s, r) => s + r.planCents, 0),
    rows.reduce((s, r) => s + r.actualCents, 0),
  );

  return { from, to, months, rows, byMonth, byCategory, totals };
}
