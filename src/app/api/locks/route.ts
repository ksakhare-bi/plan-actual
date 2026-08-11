import { ApiError, jsonOk, withAuth } from "@/lib/api";
import { listLockedMonths, lockMonth, lockQuarter, unlockMonth, unlockQuarter } from "@/lib/locks";
import { assertMonth, ValidationError } from "@/lib/period";

export const GET = withAuth(async ({ user, req }) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  
  const months = await listLockedMonths(
    user.id,
    from ? assertMonth(from, "from") : undefined,
    to ? assertMonth(to, "to") : undefined,
  );
  
  return jsonOk({ granularity: "month", lockedMonths: months });
});

export const POST = withAuth(async ({ user, req }) => {
  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new ApiError("validation_error", "Request body must be valid JSON.");
  }

  if (typeof body.month === "string") {
    const month = assertMonth(body.month);
    await lockMonth(user.id, month);
    return jsonOk({ locked: [month] }, 201);
  }
  if (body.year !== undefined && body.quarter !== undefined) {
    const locked = await lockQuarter(user.id, Number(body.year), Number(body.quarter));
    return jsonOk({ locked }, 201);
  }
  throw new ValidationError("Provide either { month } or { year, quarter }");
});

export const DELETE = withAuth(async ({ user, req }) => {
  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");
  const quarter = url.searchParams.get("quarter");

  if (month) {
    await unlockMonth(user.id, assertMonth(month));
    return jsonOk({ unlocked: [month] });
  }
  if (year && quarter) {
    const unlocked = await unlockQuarter(user.id, Number(year), Number(quarter));
    return jsonOk({ unlocked });
  }
  throw new ValidationError("Provide either ?month= or ?year=&quarter=");
});
