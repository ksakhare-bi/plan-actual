'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import RangePicker from '@/components/RangePicker';
import { ApiError, api } from '@/lib/client';
import { formatCurrency, fromCents } from '@/lib/money';
import { formatMonth, monthRange } from '@/lib/period';
import type { CategoryDto, PlanDto } from '@/lib/types';
import { useInitialRange } from '@/lib/useInitialRange';


export default function PlansPage() {
  const [range, setRange, rangeReady] = useInitialRange();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [lockedMonths, setLockedMonths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const months = useMemo(() => monthRange(range.from, range.to), [range.from, range.to]);

  const load = useCallback(async () => {
    if (!rangeReady) return;
    setLoading(true);
    try {
      const [c, p, l] = await Promise.all([
        api<{ categories: CategoryDto[] }>('/api/categories'),
        api<{ plans: PlanDto[] }>(`/api/plans?from=${range.from}&to=${range.to}`),
        api<{ lockedMonths: string[] }>(`/api/locks?from=${range.from}&to=${range.to}`),
      ]);
      setCategories(c.categories);
      setPlans(p.plans);
      setLockedMonths(l.lockedMonths);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, rangeReady]);

  useEffect(() => {
    void load();
  }, [load]);

  const planFor = (categoryId: string, month: string) =>
    plans.find((p) => p.categoryId === categoryId && p.month === month);

  async function saveCell(categoryId: string, month: string, raw: string) {
    const existing = planFor(categoryId, month);
    const trimmed = raw.trim();

    
    
    if (trimmed === '') {
      if (!existing) return;
      try {
        await api(`/api/plans/${existing.id}`, { method: 'DELETE' });
        setPlans((prev) => prev.filter((p) => p.id !== existing.id));
        setNotice(`Removed target for ${formatMonth(month)}`);
        setError(null);
      } catch (e) {
        reportError(e);
      }
      return;
    }

    const amount = Number(trimmed.replace(/[$,]/g, ''));
    if (!Number.isFinite(amount) || amount < 0) {
      setError(`"${raw}" is not a valid amount`);
      return;
    }
    if (existing && Math.round(amount * 100) === existing.amountCents) return;

    try {
      const { plan } = await api<{ plan: PlanDto }>('/api/plans', {
        method: 'POST',
        body: JSON.stringify({ categoryId, month, amount }),
      });
      setPlans((prev) => [...prev.filter((p) => p.id !== plan.id), { ...plan, locked: false }]);
      setNotice(`Saved ${formatCurrency(plan.amountCents)} for ${formatMonth(month)}`);
      setError(null);
    } catch (e) {
      reportError(e);
      void load(); 
    }
  }

  function reportError(e: unknown) {
    if (e instanceof ApiError && e.isLocked) setError(`${e.message} (HTTP 423)`);
    else setError(e instanceof Error ? e.message : 'Save failed');
    setNotice(null);
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      const { category } = await api<{ category: CategoryDto }>('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategory }),
      });
      setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategory('');
      setError(null);
      setNotice(`Added category "${category.name}"`);
    } catch (e) {
      reportError(e);
    }
  }

  const isLocked = (month: string) => lockedMonths.includes(month);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plans</h1>
        <p className="text-sm text-slate-500">
          Monthly targets per category. Blank means no target. Locked months are read-only.
        </p>
      </div>

      <RangePicker value={range} onChange={setRange} />

      <form onSubmit={addCategory} className="card flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-4 bg-white">
        <div className="grow">
          <label className="label" htmlFor="newCategory">
            New category
          </label>
          <input
            id="newCategory"
            className="input w-full"
            placeholder="e.g. Contractors"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full sm:w-auto" type="submit" disabled={!newCategory.trim()}>
          Add category
        </button>
      </form>

      {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && !error && <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">
          Targets — {formatMonth(range.from)} to {formatMonth(range.to)}
        </h2>
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Add a category to start setting targets.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th sticky left-0 bg-slate-50">Category</th>
                  {months.map((m) => (
                    <th key={m} className="th text-right" style={{ textAlign: 'right' }}>
                      <span className="flex items-center justify-end gap-1">
                        {formatMonth(m)}
                        {isLocked(m) && <span title="Locked">🔒</span>}
                      </span>
                    </th>
                  ))}
                  <th className="th text-right" style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => {
                  const total = months.reduce((s, m) => s + (planFor(c.id, m)?.amountCents ?? 0), 0);
                  return (
                    <tr key={c.id}>
                      <td className="td sticky left-0 bg-white font-medium">{c.name}</td>
                      {months.map((m) => (
                        <td key={m} className="td text-right">
                          <PlanCell
                            value={planFor(c.id, m)?.amountCents}
                            locked={isLocked(m)}
                            onCommit={(raw) => saveCell(c.id, m, raw)}
                            ariaLabel={`${c.name} target for ${formatMonth(m)}`}
                          />
                        </td>
                      ))}
                      <td className="td num text-right font-semibold">{formatCurrency(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td className="td sticky left-0 bg-slate-50">Total</td>
                  {months.map((m) => (
                    <td key={m} className="td num text-right">
                      {formatCurrency(
                        plans.filter((p) => p.month === m).reduce((s, p) => s + p.amountCents, 0),
                      )}
                    </td>
                  ))}
                  <td className="td num text-right">
                    {formatCurrency(plans.reduce((s, p) => s + p.amountCents, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}


function PlanCell({
  value,
  locked,
  onCommit,
  ariaLabel,
}: {
  value?: number;
  locked: boolean;
  onCommit: (raw: string) => void;
  ariaLabel: string;
}) {
  const stored = value === undefined ? '' : String(fromCents(value));
  const [draft, setDraft] = useState(stored);

  
  useEffect(() => setDraft(stored), [stored]);

  return (
    <input
      aria-label={ariaLabel}
      className="input w-28 text-right font-mono tabular-nums"
      inputMode="decimal"
      placeholder={locked ? '—' : '0'}
      disabled={locked}
      title={locked ? 'This month is locked' : undefined}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== stored && onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(stored);
      }}
    />
  );
}
