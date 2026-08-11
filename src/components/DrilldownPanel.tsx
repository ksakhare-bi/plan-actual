'use client';



import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { formatCurrency } from '@/lib/money';
import { formatMonth } from '@/lib/period';
import type { DrilldownDto } from '@/lib/types';

export default function DrilldownPanel({
  categoryId,
  month,
  onClose,
}: {
  categoryId: string;
  month: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<DrilldownDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<DrilldownDto>(`/api/report/drilldown?categoryId=${categoryId}&month=${month}`)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [categoryId, month]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-slate-900/30" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{data?.category.name ?? 'Loading…'}</h2>
            <p className="text-sm text-slate-500">{formatMonth(month)}</p>
          </div>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {data && (
          <>
            {data.locked && (
              <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                This period is locked — entries are read-only.
              </p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Plan</dt>
                <dd className="num mt-1">{data.plan ? formatCurrency(data.plan.amountCents) : '—'}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Actual total</dt>
                <dd className="num mt-1">{formatCurrency(data.totalCents)}</dd>
              </div>
            </dl>

            <h3 className="mt-6 text-sm font-semibold text-slate-700">
              Entries ({data.entries.length})
            </h3>
            {data.entries.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No actuals logged for this cell. The report treats this as $0.00.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {data.entries.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 py-2">
                    <div>
                      <p className="num">{formatCurrency(e.amountCents)}</p>
                      {e.note && <p className="text-xs text-slate-500">{e.note}</p>}
                    </div>
                    <time className="text-xs text-slate-400" dateTime={e.createdAt}>
                      {new Date(e.createdAt).toLocaleDateString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
