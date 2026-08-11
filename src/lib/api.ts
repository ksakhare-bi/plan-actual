import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { connectDB } from "@/lib/db";
import { getUser, type SessionUser } from "@/lib/auth";

export type ErrorCode =
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "period_locked"
  | "internal_error";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  validation_error: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  period_locked: 423,
  internal_error: 500,
};

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    hint?: string;
    details?: Record<string, string[]>;
  };
}

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly hint?: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(err: ApiError): NextResponse<ApiErrorBody> {
  return NextResponse.json<ApiErrorBody>(
    {
      error: {
        code: err.code,
        message: err.message,
        ...(err.hint ? { hint: err.hint } : {}),
        ...(err.details ? { details: err.details } : {}),
      },
    },
    { status: STATUS_BY_CODE[err.code] },
  );
}

export function jsonOk<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("validation_error", "Request body must be valid JSON.");
  }

  try {
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".") || "_";
        (details[key] ??= []).push(issue.message);
      }
      throw new ApiError(
        "validation_error",
        "Some fields need attention before this can be saved.",
        "Correct the highlighted fields and submit again.",
        details,
      );
    }
    throw err;
  }
}

type Handler<C> = (ctx: { user: SessionUser; req: Request; params: C }) => Promise<Response>;

export function withAuth<C = unknown>(handler: Handler<C>) {
  return async (req: Request, ctx: { params: Promise<C> }): Promise<Response> => {
    try {
      const user = await getUser();
      if (!user) {
        throw new ApiError(
          "unauthorized",
          "You need to be signed in to do that.",
          "Sign in and retry the request.",
        );
      }
      await connectDB();
      const params = (ctx?.params ? await ctx.params : {}) as C;
      return await handler({ user, req, params });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export function withPublic(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      await connectDB();
      return await handler(req);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

function toErrorResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof ApiError) return errorResponse(err);

  if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
    return errorResponse(
      new ApiError(
        "conflict",
        "That value is already taken.",
        "Try a different one, or sign in instead.",
      ),
    );
  }

  const name = (err as { name?: string }).name;
  const message = (err as { message?: string }).message;
  if (name === "PeriodLockedError") {
    return errorResponse(new ApiError("period_locked", message ?? "Period is locked."));
  }
  if (name === "NotFoundError") {
    return errorResponse(new ApiError("not_found", message ?? "Not found."));
  }
  if (name === "ValidationError") {
    return errorResponse(new ApiError("validation_error", message ?? "Validation error."));
  }
  if (name === "ConflictError") {
    return errorResponse(new ApiError("conflict", message ?? "Conflict."));
  }
  if (name === "UnauthorizedError") {
    return errorResponse(new ApiError("unauthorized", message ?? "Unauthorized."));
  }

  console.error("[api] unhandled error:", err);
  return errorResponse(
    new ApiError(
      "internal_error",
      "Something went wrong on our side.",
      "Retry in a moment. If it keeps happening, contact support.",
    ),
  );
}
