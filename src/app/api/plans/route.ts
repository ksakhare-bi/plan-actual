import { jsonOk, parseBody, withAuth } from "@/lib/api";
import { requireOwnedCategory } from "@/lib/categories";
import { Plan } from "@/models/Plan";
import { Category } from "@/models/Category";
import { toObjectId } from "@/lib/db";
import { assertMonthUnlocked, listLockedMonths } from "@/lib/locks";
import { toCents } from "@/lib/money";
import { assertMonth } from "@/lib/period";
import { planSchema } from "@/lib/schemas";

export const GET = withAuth(async ({ user, req }) => {
  const owner = toObjectId(user.id)!;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const query: Record<string, any> = { userId: owner };
  if (from && to) {
    query.month = {
      $gte: assertMonth(from, "from"),
      $lte: assertMonth(to, "to"),
    };
  }

  const [docs, categoryDocs, locked] = await Promise.all([
    Plan.find(query).sort({ month: 1 }).lean(),
    Category.find({ userId: owner }).select("name").lean(),
    listLockedMonths(user.id),
  ]);

  const nameById = new Map(categoryDocs.map((c) => [String(c._id), c.name]));
  const lockedMonths = new Set(locked);

  return jsonOk({
    plans: docs.map((p) => ({
      id: String(p._id),
      month: p.month,
      amountCents: p.amountCents,
      categoryId: String(p.categoryId),
      categoryName: nameById.get(String(p.categoryId)) ?? "Unknown",
      locked: lockedMonths.has(p.month),
    })),
  });
});

export const POST = withAuth(async ({ user, req }) => {
  const { month: rawMonth, categoryId, amount } = await parseBody(req, planSchema);
  const month = assertMonth(rawMonth);
  const category = await requireOwnedCategory(user.id, categoryId);
  const amountCents = toCents(amount, "amount");

  await assertMonthUnlocked(user.id, month);

  const plan = await Plan.findOneAndUpdate(
    { userId: toObjectId(user.id)!, categoryId: toObjectId(category.id)!, month },
    { amountCents },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return jsonOk(
    {
      plan: {
        id: String(plan._id),
        month: plan.month,
        amountCents: plan.amountCents,
        categoryId: String(plan.categoryId),
        categoryName: category.name,
      },
    },
    201,
  );
});
