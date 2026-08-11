'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { currentMonth, formatMonth, makeMonth, quarterMonths, splitMonth } from '@/lib/period';


export default function PeriodsPage() {
  const [year, setYear] = useState(() => splitMonth(currentMonth()).year);
  const [locked, setLocked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { lockedMonths } = await api<{ lockedMonths: string[] }>(
        `/api/locks?from=${makeMonth(year, 1)}&to=${makeMonth(year, 12)}`,
      );
      setLocked(lockedMonths);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load locks');
    }
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleMonth(month: string) {
    const isLocked = locked.includes(month);
    setBusy(month);
    try {
      if (isLocked) await api(`/api/locks?month=${month}`, { method: 'DELETE' });
      else await api('/api/locks', { method: 'POST', body: JSON.stringify({ month }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update lock');
    } finally {
      setBusy(null);
    }
  }

  async function toggleQuarter(quarter: number, lock: boolean) {
    setBusy(`Q${quarter}`);
    try {
      if (lock) await api('/api/locks', { method: 'POST', body: JSON.stringify({ year, quarter }) });
      else await api(`/api/locks?year=${year}&quarter=${quarter}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update lock');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Periods</h1>
        <p className="text-sm text-slate-500">
          Locking granularity is the <strong>month</strong>. Locked months reject plan and actual writes at the API
          with HTTP 423 — not just in the UI.
        </p>
      </div>

      <div className="card flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white">
        <div className="flex items-center gap-3">
          <button className="btn-secondary" onClick={() => setYear(year - 1)}>
            ← {year - 1}
          </button>
          <span className="text-lg font-semibold">{year}</span>
          <button className="btn-secondary" onClick={() => setYear(year + 1)}>
            {year + 1} →
          </button>
        </div>
        <span className="text-sm text-slate-500">
          {locked.length} of 12 months locked in {year}
        </span>
      </div>

      {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((q) => {
          const months = quarterMonths(year, q);
          const allLocked = months.every((m) => locked.includes(m));
          return (
            <section key={q} className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  Q{q} {year}
                </h2>
                <button
                  className={allLocked ? 'btn-secondary' : 'btn-primary'}
                  disabled={busy !== null}
                  onClick={() => toggleQuarter(q, !allLocked)}
                >
                  {busy === `Q${q}` ? '…' : allLocked ? 'Unlock quarter' : 'Lock quarter'}
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {months.map((m) => {
                  const isLocked = locked.includes(m);
                  return (
                    <li key={m} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                      <span className="flex items-center gap-2 text-sm">
                        {formatMonth(m)}
                        {isLocked ? (
                          <span className="badge bg-amber-100 text-amber-800">Locked</span>
                        ) : (
                          <span className="badge bg-emerald-100 text-emerald-800">Open</span>
                        )}
                      </span>
                      <button
                        className={isLocked ? 'btn-secondary' : 'btn-secondary'}
                        disabled={busy !== null}
                        onClick={() => toggleMonth(m)}
                      >
                        {busy === m ? '…' : isLocked ? 'Unlock' : 'Lock'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
