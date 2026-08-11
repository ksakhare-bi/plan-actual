

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function isValidMonth(month: string): boolean {
  return MONTH_RE.test(month);
}


export function assertMonth(month: string, field = 'month'): string {
  if (typeof month !== 'string' || !MONTH_RE.test(month)) {
    throw new ValidationError(`${field} must be in YYYY-MM format (got "${month}")`);
  }
  return month;
}


export function splitMonth(month: string): { year: number; month: number } {
  assertMonth(month);
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) };
}

export function makeMonth(year: number, month: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}


export function monthRange(from: string, to: string): string[] {
  assertMonth(from, 'from');
  assertMonth(to, 'to');
  if (from > to) throw new ValidationError(`from (${from}) must not be after to (${to})`);

  const start = splitMonth(from);
  const end = splitMonth(to);
  const months: string[] = [];
  let y = start.year;
  let m = start.month;
  while (y < end.year || (y === end.year && m <= end.month)) {
    months.push(makeMonth(y, m));
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

export function addMonths(month: string, delta: number): string {
  const { year, month: m } = splitMonth(month);
  const zeroBased = year * 12 + (m - 1) + delta;
  return makeMonth(Math.floor(zeroBased / 12), (zeroBased % 12) + 1);
}


export function quarterOf(month: string): number {
  return Math.floor((splitMonth(month).month - 1) / 3) + 1;
}


export function quarterMonths(year: number, quarter: number): string[] {
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    throw new ValidationError(`quarter must be 1-4 (got ${quarter})`);
  }
  const first = (quarter - 1) * 3 + 1;
  return [makeMonth(year, first), makeMonth(year, first + 1), makeMonth(year, first + 2)];
}


const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatMonth(month: string): string {
  const { year, month: m } = splitMonth(month);
  return `${MONTH_LABELS[m - 1]} ${year}`;
}


export function currentMonth(now = new Date()): string {
  return makeMonth(now.getFullYear(), now.getMonth() + 1);
}
