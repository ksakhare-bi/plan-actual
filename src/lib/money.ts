

import { ValidationError } from './period';


export function toCents(value: unknown, field = 'amount'): number {
  let text: string;
  if (typeof value === 'string') text = value.replace(/[$,]/g, '').trim();
  else if (typeof value === 'number') text = String(value);
  else throw new ValidationError(`${field} is required`);

  
  
  if (text === '') throw new ValidationError(`${field} is required`);

  const num = Number(text);
  if (!Number.isFinite(num)) throw new ValidationError(`${field} must be a number (got "${value}")`);
  if (num < 0) throw new ValidationError(`${field} must not be negative`);
  const cents = Math.round(num * 100);
  if (cents > Number.MAX_SAFE_INTEGER) throw new ValidationError(`${field} is too large`);
  return cents;
}

export function fromCents(cents: number): number {
  return cents / 100;
}


export function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fromCents(cents));
}


export function formatSignedCurrency(cents: number, currency = 'USD'): string {
  if (cents === 0) return formatCurrency(0, currency);
  const sign = cents > 0 ? '+' : '−'; 
  return `${sign}${formatCurrency(Math.abs(cents), currency)}`;
}


export function formatPercent(pct: number | null): string {
  if (pct === null) return 'N/A';
  if (pct === 0) return '0.00%';
  const sign = pct > 0 ? '+' : '−';
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}
