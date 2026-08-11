'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fromCents } from '@/lib/money';
import { formatMonth } from '@/lib/period';
import type { CategoryTotal, MonthlyTotal } from '@/lib/report';

const UNDER = '#0f766e'; 
const OVER = '#b91c1c'; 
const PLAN = '#cbd5e1';
const ACTUAL = '#334155';

const money = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

export type ChartMode = 'net-variance' | 'category-totals';

export default function VarianceChart({
  mode,
  byMonth,
  byCategory,
}: {
  mode: ChartMode;
  byMonth: MonthlyTotal[];
  byCategory: CategoryTotal[];
}) {
  if (mode === 'net-variance') {
    const data = byMonth.map((m) => ({
      label: formatMonth(m.month),
      variance: fromCents(m.varianceCents),
    }));
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tickFormatter={money} tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
          <Tooltip
            formatter={(v: number) => [money(v), 'Net variance']}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <ReferenceLine y={0} stroke="#475569" />
          <Bar dataKey="variance" name="Net variance (actual − plan)" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.variance > 0 ? OVER : UNDER} />
            ))}
          </Bar>
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const data = byCategory.map((c) => ({
    label: c.categoryName,
    plan: fromCents(c.planCents),
    actual: fromCents(c.actualCents),
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis tickFormatter={money} tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
        <Tooltip formatter={(v: number) => money(v)} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="plan" name="Plan" fill={PLAN} radius={[3, 3, 0, 0]} />
        <Bar dataKey="actual" name="Actual" fill={ACTUAL} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
