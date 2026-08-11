'use client';

import { useState } from 'react';
import { ApiError, api } from '@/lib/client';

const SAMPLE = `month,category,amount
2026-01,Marketing,4800
2026-01,Payroll,20500
2026-02,Payroll,19800`;

interface RowError {
  line: number;
  message: string;
  raw: string;
}


export default function CsvImport({
  onImported,
  onError,
}: {
  onImported: (summary: string) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [createMissing, setCreateMissing] = useState(false);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [busy, setBusy] = useState(false);

  async function readFile(file: File) {
    setCsv(await file.text());
    setRowErrors([]);
  }

  async function submit() {
    setBusy(true);
    setRowErrors([]);
    try {
      const result = await api<{ imported: number; replaced: number; months: string[] }>(
        '/api/actuals/import',
        {
          method: 'POST',
          body: JSON.stringify({ csv, mode, createMissingCategories: createMissing }),
        },
      );
      onImported(
        `Imported ${result.imported} entr${result.imported === 1 ? 'y' : 'ies'} across ${result.months.join(', ')}` +
          (result.replaced > 0 ? ` (replaced ${result.replaced} existing)` : ''),
      );
      setCsv('');
      setOpen(false);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CSV_VALIDATION_ERROR') {
        const details = e.details as { errors?: RowError[] } | undefined;
        setRowErrors(details?.errors ?? []);
        onError(e.message);
      } else {
        onError(e instanceof Error ? e.message : 'Import failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">CSV import</h2>
          <p className="text-sm text-slate-500">
            Columns: <code className="rounded bg-slate-100 px-1">month,category,amount</code> (optional{' '}
            <code className="rounded bg-slate-100 px-1">note</code>). Nothing is imported unless every row is valid.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : 'Import CSV'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".csv,text/csv"
              className="text-sm"
              onChange={(e) => e.target.files?.[0] && void readFile(e.target.files[0])}
            />
            <button className="btn-secondary" onClick={() => setCsv(SAMPLE)}>
              Paste sample
            </button>
          </div>

          <textarea
            className="input h-40 font-mono text-xs"
            placeholder={SAMPLE}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={mode === 'append'}
                onChange={() => setMode('append')}
              />
              Append
            </label>
            <label className="flex items-center gap-2 text-sm" title="Clears existing entries for each (month, category) in the file first">
              <input
                type="radio"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
              />
              Replace matching month + category
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createMissing}
                onChange={(e) => setCreateMissing(e.target.checked)}
              />
              Create unknown categories
            </label>
            <button className="btn-primary" disabled={busy || csv.trim() === ''} onClick={submit}>
              {busy ? 'Importing…' : 'Import'}
            </button>
          </div>

          {rowErrors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-800">
                {rowErrors.length} invalid row(s) — nothing was imported
              </p>
              <ul className="mt-2 space-y-1 text-xs text-red-700">
                {rowErrors.map((e) => (
                  <li key={e.line}>
                    <span className="font-semibold">Line {e.line}:</span> {e.message}
                    {e.raw && <code className="ml-1 rounded bg-white/60 px-1">{e.raw}</code>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
