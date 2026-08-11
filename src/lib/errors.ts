import { NextResponse } from 'next/server';
import { ValidationError } from './period';


export class PeriodLockedError extends Error {
  readonly month: string;
  constructor(month: string) {
    super(`Period ${month} is locked. Unlock it before editing plans or actuals.`);
    this.name = 'PeriodLockedError';
    this.month = month;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Not authenticated') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export interface ApiErrorBody {
  error: string;
  code: string;
  details?: unknown;
}


export function toErrorResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof PeriodLockedError) {
    return NextResponse.json(
      { error: err.message, code: 'PERIOD_LOCKED', details: { month: err.month } },
      { status: 423 },
    );
  }
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message, code: 'VALIDATION_ERROR' }, { status: 400 });
  }
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message, code: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.message, code: 'NOT_FOUND' }, { status: 404 });
  }
  if (err instanceof ConflictError) {
    return NextResponse.json({ error: err.message, code: 'CONFLICT' }, { status: 409 });
  }
  console.error('[api] unhandled error', err);
  return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL' }, { status: 500 });
}
