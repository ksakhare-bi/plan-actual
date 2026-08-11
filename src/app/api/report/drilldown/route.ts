import { jsonOk, withAuth } from "@/lib/api";
import { requireOwnedCategory } from "@/lib/categories";
import { Plan } from "@/models/Plan";
import { Actual } from "@/models/Actual";
import { toObjectId } from "@/lib/db";
import { isMonthLocked } from "@/lib/locks";
import { assertMonth, ValidationError } from "@/lib/period";

export const GET = withAuth(async ({ user, req }) => {
  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const categoryId = url.searchParams.get("categoryId");
  if (!month) throw new ValidationError("month query parameter is required");
  assertMonth(month);

  const category = await requireOwnedCategory(user.id, categoryId);
  const owner = toObjectId(user.id)!;
  const cell = { userId: owner, categoryId: toObjectId(category.id)!, month };

  const [entries, plan, locked] = await Promise.all([
    Actual.find(cell).sort({ createdAt: -1 }).lean(),
    Plan.findOne(cell).lean(),
    isMonthLocked(user.id, month),
  ]);

  return jsonOk({
    month,
    category,
    locked,
    plan: plan ? { id: String(plan._id), amountCents: plan.amountCents } : null,
    entries: entries.map((e) => ({
      id: String(e._id),
      amountCents: e.amountCents,
      note: e.note,
      createdAt: e.createdAt,
    })),
    totalCents: entries.reduce((s, e) => s + e.amountCents, 0),
  });
});
