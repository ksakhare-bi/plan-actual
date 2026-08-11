"use client";

import { currentMonth, makeMonth, quarterMonths, splitMonth } from "@/lib/period";

export interface Range {
  from: string;
  to: string;
}

export default function RangePicker({
  value,
  onChange,
  children,
}: {
  value: Range;
  onChange: (r: Range) => void;
  children?: React.ReactNode;
}) {
  const year = splitMonth(value.from).year;

  function setQuarter(q: number) {
    const months = quarterMonths(year, q);
    onChange({ from: months[0], to: months[2] });
  }

  function setYear(nextYear: number) {
    onChange({ from: makeMonth(nextYear, 1), to: makeMonth(nextYear, 12) });
  }

  const activeQuarter =
    value.from === makeMonth(year, 1) && value.to === makeMonth(year, 3)
      ? 1
      : value.from === makeMonth(year, 4) && value.to === makeMonth(year, 6)
        ? 2
        : value.from === makeMonth(year, 7) && value.to === makeMonth(year, 9)
          ? 3
          : value.from === makeMonth(year, 10) && value.to === makeMonth(year, 12)
            ? 4
            : 0;

  const isFullYearActive =
    value.from === makeMonth(year, 1) && value.to === makeMonth(year, 12);

  return (
    <div className="card flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-4 bg-white">
      <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-6 w-full lg:w-auto">
        {/* Fiscal Year */}
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <span className="label">Fiscal Year</span>
          <div className="flex items-center justify-between md:justify-start gap-1 bg-slate-100 p-1 rounded-lg h-10 w-full md:w-auto">
            <button
              onClick={() => setYear(year - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
              title="Previous Year"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <span className="font-bold px-3 text-slate-800 text-sm min-w-[3.5rem] text-center select-none font-mono">
              {year}
            </span>
            <button
              onClick={() => setYear(year + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
              title="Next Year"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <span className="label">Presets</span>
          <div className="flex items-center justify-between md:justify-start gap-1 bg-slate-100 p-1 rounded-lg h-10 w-full md:w-auto">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                className={`h-8 px-2.5 md:px-3.5 rounded-md text-xs font-bold tracking-wide transition-all grow md:grow-0 text-center ${
                  activeQuarter === q && !isFullYearActive
                    ? "bg-white text-slate-900 shadow-sm border-slate-200/50"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setQuarter(q)}
              >
                Q{q}
              </button>
            ))}
            <button
              className={`h-8 px-3 md:px-4 rounded-md text-xs font-bold tracking-wide transition-all grow md:grow-0 text-center ${
                isFullYearActive
                  ? "bg-white text-slate-900 shadow-sm border-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setYear(year)}
            >
              Full Year
            </button>
          </div>
        </div>

        {/* Custom Range */}
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <span className="label">Custom Range</span>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
            <input
              id="from"
              className="input w-full sm:w-36 h-10 py-1 border-slate-200 focus:border-slate-400"
              type="month"
              value={value.from}
              max={value.to}
              onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })}
            />
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-0.5 text-center sm:text-left">to</span>
            <input
              id="to"
              className="input w-full sm:w-36 h-10 py-1 border-slate-200 focus:border-slate-400"
              type="month"
              value={value.to}
              min={value.from}
              onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })}
            />
          </div>
        </div>
      </div>

      {children && (
        <div className="flex items-center gap-2 self-stretch lg:self-center justify-end">
          {children}
        </div>
      )}
    </div>
  );
}

export function defaultRange(): Range {
  const now = currentMonth();
  const { year, month } = splitMonth(now);
  const months = quarterMonths(year, Math.floor((month - 1) / 3) + 1);
  return { from: months[0], to: months[2] };
}
