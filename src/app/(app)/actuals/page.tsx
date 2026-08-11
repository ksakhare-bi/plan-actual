'use client';

import { useCallback, useEffect, useState } from 'react';
import CsvImport from '@/components/CsvImport';
import RangePicker from '@/components/RangePicker';
import { ApiError, api } from '@/lib/client';
import { formatCurrency } from '@/lib/money';
import { currentMonth, formatMonth } from '@/lib/period';
import type { ActualDto, CategoryDto } from '@/lib/types';
import { useInitialRange } from '@/lib/useInitialRange';

export default function ActualsPage() {
  const [range, setRange, rangeReady] = useInitialRange();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [actuals, setActuals] = useState<ActualDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ categoryId: '', month: currentMonth(), amount: '', note: '' });

  const load = useCallback(async () => {
    if (!rangeReady) return;
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        api<{ categories: CategoryDto[] }>('/api/categories'),
        api<{ actuals: ActualDto[] }>(`/api/actuals?from=${range.from}&to=${range.to}`),
      ]);
      setCategories(c.categories);
      setActuals(a.actuals);
      setForm((f) => ({ ...f, categoryId: f.categoryId || (c.categories[0]?.id ?? '') }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load actuals');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, rangeReady]);

  useEffect(() => {
    void load();
  }, [load]);

  function reportError(e: unknown) {
    if (e instanceof ApiError && e.isLocked) setError(`${e.message} (HTTP 423)`);
    else setError(e instanceof Error ? e.message : 'Request failed');
    setNotice(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/actuals', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: form.categoryId,
          month: form.month,
          amount: form.amount,
          note: form.note,
        }),
      });
      setForm((f) => ({ ...f, amount: '', note: '' }));
      setError(null);
      setNotice(`Logged ${form.amount} for ${formatMonth(form.month)}`);
      await load();
    } catch (err) {
      reportError(err);
    }
  }

  async function remove(actual: ActualDto) {
    try {
      await api(`/api/actuals/${actual.id}`, { method: 'DELETE' });
      setActuals((prev) => prev.filter((a) => a.id !== actual.id));
      setError(null);
      setNotice('Entry deleted');
    } catch (err) {
      reportError(err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Actuals</h1>
        <p className="text-sm text-slate-500">
          Log spend per category and month. Multiple entries in the same month are summed in the report.
        </p>
      </div>

      <RangePicker value={range} onChange={setRange} />

      <section className="card p-4">
        <h2 className="font-semibold">Log an actual</h2>
        <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
          <div className="w-full sm:w-auto">
            <label className="label" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              className="input w-full sm:w-48"
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <label className="label" htmlFor="month">
              Month
            </label>
            <input
              id="month"
              className="input w-full sm:w-40"
              type="month"
              required
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="label" htmlFor="amount">
              Amount
            </label>
            <input
              id="amount"
              className="input w-full sm:w-32 text-right font-mono"
              inputMode="decimal"
              placeholder="4800"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="w-full sm:w-auto grow">
            <label className="label" htmlFor="note">
              Note (optional)
            </label>
            <input
              id="note"
              className="input w-full"
              placeholder="Q1 campaign"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          <button className="btn-primary w-full sm:w-auto" type="submit" disabled={categories.length === 0}>
            Add entry
          </button>
        </form>
      </section>

      <CsvImport
        onImported={(summary) => {
          setNotice(summary);
          setError(null);
          void load();
        }}
        onError={setError}
      />

      {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && !error && <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">
          Entries — {formatMonth(range.from)} to {formatMonth(range.to)} ({actuals.length})
        </h2>
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : actuals.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No actuals logged in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Month</th>
                  <th className="th">Category</th>
                  <th className="th text-right" style={{ textAlign: 'right' }}>Amount</th>
                  <th className="th">Note</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {actuals.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="td">
                      <span className="flex items-center gap-2">
                        {formatMonth(a.month)}
                        {a.locked && <span className="badge bg-amber-100 text-amber-800">Locked</span>}
                      </span>
                    </td>
                    <td className="td">{a.categoryName}</td>
                    <td className="td num text-right">{formatCurrency(a.amountCents)}</td>
                    <td className="td text-slate-500">{a.note ?? '—'}</td>
                    <td className="td text-right">
                      <button
                        className="btn-danger"
                        disabled={a.locked}
                        title={a.locked ? 'This month is locked' : 'Delete entry'}
                        onClick={() => remove(a)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
