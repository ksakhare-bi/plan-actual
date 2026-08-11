'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DrilldownPanel from '@/components/DrilldownPanel';
import RangePicker from '@/components/RangePicker';
import VarianceChart, { type ChartMode } from '@/components/VarianceChart';
import { api } from '@/lib/client';
import { formatCurrency, formatPercent, formatSignedCurrency } from '@/lib/money';
import { formatMonth } from '@/lib/period';
import type { ReportCell } from '@/lib/report';
import type { ReportDto } from '@/lib/types';
import { useInitialRange } from '@/lib/useInitialRange';

type GroupBy = 'category' | 'month';

export default function ReportPage() {
  const [range, setRange, rangeReady] = useInitialRange();
  const [report, setReport] = useState<ReportDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chart, setChart] = useState<ChartMode>('net-variance');
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [drilldown, setDrilldown] = useState<{ categoryId: string; month: string } | null>(null);

  const load = useCallback(async () => {
    if (!rangeReady) return; 
    setLoading(true);
    setError(null);
    try {
      setReport(await api<ReportDto>(`/api/report?from=${range.from}&to=${range.to}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, rangeReady]);

  useEffect(() => {
    void load();
  }, [load]);

  
  
  const rows = useMemo(() => {
    if (!report) return [];
    const copy = [...report.rows];
    if (groupBy === 'month') {
      copy.sort((a, b) => a.month.localeCompare(b.month) || a.categoryName.localeCompare(b.categoryName));
    }
    return copy;
  }, [report, groupBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Report</h1>
          <p className="text-sm text-slate-500">
            Plan vs actual with variance. Missing actuals are treated as $0.00; variance % is N/A when plan is 0.
          </p>
        </div>
        <a className="btn-secondary" href={`/api/report/export?from=${range.from}&to=${range.to}`}>
          Export CSV
        </a>
      </div>

      <RangePicker value={range} onChange={setRange} />

      {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading && !report && <p className="text-sm text-slate-500">Loading…</p>}

      {report && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total plan" value={formatCurrency(report.totals.planCents)} />
            <Stat label="Total actual" value={formatCurrency(report.totals.actualCents)} />
            <Stat
              label="Net variance"
              value={formatSignedCurrency(report.totals.varianceCents)}
              tone={report.totals.varianceCents > 0 ? 'bad' : report.totals.varianceCents < 0 ? 'good' : 'neutral'}
            />
            <Stat
              label="Variance %"
              value={formatPercent(report.totals.variancePct)}
              tone={
                report.totals.variancePct === null
                  ? 'neutral'
                  : report.totals.variancePct > 0
                    ? 'bad'
                    : report.totals.variancePct < 0
                      ? 'good'
                      : 'neutral'
              }
            />
          </section>

          <section className="card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">
                {chart === 'net-variance' ? 'Monthly net variance' : 'Category totals'}
              </h2>
              <div className="flex gap-1">
                <button
                  className={chart === 'net-variance' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setChart('net-variance')}
                >
                  Net variance
                </button>
                <button
                  className={chart === 'category-totals' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setChart('category-totals')}
                >
                  Category totals
                </button>
              </div>
            </div>
            {report.rows.length === 0 ? (
              <EmptyState />
            ) : (
              <VarianceChart mode={chart} byMonth={report.byMonth} byCategory={report.byCategory} />
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 className="font-semibold">
                {formatMonth(report.from)} – {formatMonth(report.to)}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-500">Group by</span>
                <div className="flex gap-1">
                  <button
                    className={groupBy === 'category' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setGroupBy('category')}
                  >
                    Category
                  </button>
                  <button
                    className={groupBy === 'month' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setGroupBy('month')}
                  >
                    Month
                  </button>
                </div>
              </div>
            </div>

            {report.rows.length === 0 ? (
              <div className="p-4">
                <EmptyState />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Category</th>
                      <th className="th">Month</th>
                      <th className="th text-right" style={{ textAlign: 'right' }}>Plan</th>
                      <th className="th text-right" style={{ textAlign: 'right' }}>Actual</th>
                      <th className="th text-right" style={{ textAlign: 'right' }}>Variance</th>
                      <th className="th text-right" style={{ textAlign: 'right' }}>Variance %</th>
                      <th className="th" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <Row
                        key={`${r.categoryId}-${r.month}`}
                        row={r}
                        showGroupHeader={
                          groupBy === 'category'
                            ? i === 0 || rows[i - 1].categoryId !== r.categoryId
                            : i === 0 || rows[i - 1].month !== r.month
                        }
                        groupBy={groupBy}
                        onDrilldown={() => setDrilldown({ categoryId: r.categoryId, month: r.month })}
                      />
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold">
                    <tr>
                      <td className="td" colSpan={2}>
                        Total
                      </td>
                      <td className="td num text-right">{formatCurrency(report.totals.planCents)}</td>
                      <td className="td num text-right">{formatCurrency(report.totals.actualCents)}</td>
                      <td className={`td num text-right ${varianceColor(report.totals.varianceCents)}`}>
                        {formatSignedCurrency(report.totals.varianceCents)}
                      </td>
                      <td className={`td num text-right ${varianceColor(report.totals.varianceCents)}`}>
                        {formatPercent(report.totals.variancePct)}
                      </td>
                      <td className="td" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          <section className="card overflow-hidden">
            <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">Monthly summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Month</th>
                    <th className="th text-right" style={{ textAlign: 'right' }}>Plan</th>
                    <th className="th text-right" style={{ textAlign: 'right' }}>Actual</th>
                    <th className="th text-right" style={{ textAlign: 'right' }}>Variance</th>
                    <th className="th text-right" style={{ textAlign: 'right' }}>Variance %</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byMonth.map((m) => (
                    <tr key={m.month}>
                      <td className="td">{formatMonth(m.month)}</td>
                      <td className="td num text-right">{formatCurrency(m.planCents)}</td>
                      <td className="td num text-right">{formatCurrency(m.actualCents)}</td>
                      <td className={`td num text-right ${varianceColor(m.varianceCents)}`}>
                        {formatSignedCurrency(m.varianceCents)}
                      </td>
                      <td className={`td num text-right ${varianceColor(m.varianceCents)}`}>
                        {formatPercent(m.variancePct)}
                      </td>
                      <td className="td">
                        {m.locked ? (
                          <span className="badge bg-amber-100 text-amber-800">Locked</span>
                        ) : (
                          <span className="badge bg-emerald-100 text-emerald-800">Open</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {drilldown && (
        <DrilldownPanel
          categoryId={drilldown.categoryId}
          month={drilldown.month}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}

function varianceColor(cents: number): string {
  if (cents > 0) return 'text-red-700';
  if (cents < 0) return 'text-teal-700';
  return 'text-slate-600';
}

function Row({
  row,
  showGroupHeader,
  groupBy,
  onDrilldown,
}: {
  row: ReportCell;
  showGroupHeader: boolean;
  groupBy: GroupBy;
  onDrilldown: () => void;
}) {
  return (
    <tr className="hover:bg-slate-50">
      <td className={`td ${groupBy === 'category' && !showGroupHeader ? 'text-slate-400' : ''}`}>
        {groupBy === 'category' && !showGroupHeader ? '↳' : row.categoryName}
      </td>
      <td className="td">
        <span className="flex items-center gap-2">
          {formatMonth(row.month)}
          {row.locked && <span className="badge bg-amber-100 text-amber-800">Locked</span>}
        </span>
      </td>
      <td className="td num text-right">{formatCurrency(row.planCents)}</td>
      <td className="td num text-right">
        <span className="inline-flex items-center gap-1.5">
          {!row.hasActualEntries && (
            <span
              className="badge bg-slate-100 text-slate-500"
              title="No actuals logged for this month — treated as $0.00"
            >
              no entries
            </span>
          )}
          {formatCurrency(row.actualCents)}
        </span>
      </td>
      <td className={`td num text-right ${varianceColor(row.varianceCents)}`}>
        {formatSignedCurrency(row.varianceCents)}
      </td>
      <td className={`td num text-right ${varianceColor(row.varianceCents)}`}>
        {formatPercent(row.variancePct)}
      </td>
      <td className="td text-right">
        <button className="text-xs font-medium text-slate-600 underline hover:text-slate-900" onClick={onDrilldown}>
          Details
        </button>
      </td>
    </tr>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  const color = tone === 'bad' ? 'text-red-700' : tone === 'good' ? 'text-teal-700' : 'text-slate-900';
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`num mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <p className="text-sm text-slate-500">
      Nothing in this range yet. Add targets on the <strong>Plans</strong> page and log spend on{' '}
      <strong>Actuals</strong> — or run <code className="rounded bg-slate-100 px-1">npm run db:seed</code> to load
      the sample data.
    </p>
  );
}
