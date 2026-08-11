

import { MONTH_RE } from './period';

export interface CsvActualRow {
  
  line: number;
  month: string;
  category: string;
  amountCents: number;
  note?: string;
}

export interface CsvRowError {
  line: number;
  message: string;
  raw: string;
}

export interface CsvParseResult {
  rows: CsvActualRow[];
  errors: CsvRowError[];
}


function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(field);
      field = '';
    } else field += ch;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

const REQUIRED = ['month', 'category', 'amount'] as const;


export function parseActualsCsv(text: string, knownCategories?: string[]): CsvParseResult {
  const rows: CsvActualRow[] = [];
  const errors: CsvRowError[] = [];

  const canonical = new Map((knownCategories ?? []).map((n) => [n.trim().toLowerCase(), n]));

  const lines = text
    .replace(/^﻿/, '') 
    .split(/\r?\n/);

  const headerIndex = lines.findIndex((l) => l.trim() !== '');
  if (headerIndex === -1) {
    return { rows, errors: [{ line: 1, message: 'File is empty', raw: '' }] };
  }

  const header = splitCsvLine(lines[headerIndex]).map((h) => h.toLowerCase());
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return {
      rows,
      errors: [
        {
          line: headerIndex + 1,
          message: `Header is missing required column(s): ${missing.join(', ')}. Expected "month,category,amount".`,
          raw: lines[headerIndex],
        },
      ],
    };
  }

  const col = {
    month: header.indexOf('month'),
    category: header.indexOf('category'),
    amount: header.indexOf('amount'),
    note: header.indexOf('note'),
  };

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === '') continue;
    const line = i + 1;
    const cells = splitCsvLine(raw);

    const month = cells[col.month] ?? '';
    const category = (cells[col.category] ?? '').trim();
    const amountText = (cells[col.amount] ?? '').replace(/[$,]/g, '').trim();

    if (!MONTH_RE.test(month)) {
      errors.push({ line, message: `Invalid month "${month}" — expected YYYY-MM (e.g. 2026-01)`, raw });
      continue;
    }
    if (category === '') {
      errors.push({ line, message: 'Category is required', raw });
      continue;
    }
    if (canonical.size > 0 && !canonical.has(category.toLowerCase())) {
      errors.push({ line, message: `Unknown category "${category}"`, raw });
      continue;
    }
    const amount = Number(amountText);
    if (amountText === '' || !Number.isFinite(amount)) {
      errors.push({ line, message: `Invalid amount "${cells[col.amount] ?? ''}" — expected a number`, raw });
      continue;
    }
    if (amount < 0) {
      errors.push({ line, message: `Amount must not be negative (got ${amount})`, raw });
      continue;
    }

    const note = col.note >= 0 ? (cells[col.note] ?? '').trim() : '';
    rows.push({
      line,
      month,
      category: canonical.get(category.toLowerCase()) ?? category,
      amountCents: Math.round(amount * 100),
      ...(note ? { note } : {}),
    });
  }

  return { rows, errors };
}

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  return [header.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n') + '\r\n';
}
