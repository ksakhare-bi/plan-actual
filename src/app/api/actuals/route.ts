import { jsonOk, parseBody, withAuth } from "@/lib/api";
import { requireOwnedCategory } from "@/lib/categories";
import { Actual } from "@/models/Actual";
import { Category } from "@/models/Category";
import { toObjectId } from "@/lib/db";
import { assertMonthUnlocked, listLockedMonths } from "@/lib/locks";
import { toCents } from "@/lib/money";
import { assertMonth, ValidationError } from "@/lib/period";
import { actualSchema } from "@/lib/schemas";

export const GET = withAuth(async ({ user, req }) => {
  const owner = toObjectId(user.id)!;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const categoryId = url.searchParams.get("categoryId");
  const categoryFilter = categoryId ? toObjectId(categoryId) : null;

  const query: Record<string, any> = { userId: owner };
  if (from && to) {
    query.month = {
      $gte: assertMonth(from, "from"),
      $lte: assertMonth(to, "to"),
    };
  }
  if (categoryFilter) {
    query.categoryId = categoryFilter;
  }

  const [docs, categoryDocs, locked] = await Promise.all([
    Actual.find(query).sort({ month: -1, createdAt: -1 }).lean(),
    Category.find({ userId: owner }).select("name").lean(),
    listLockedMonths(user.id),
  ]);

  const nameById = new Map(categoryDocs.map((c) => [String(c._id), c.name]));
  const lockedMonths = new Set(locked);

  return jsonOk({
    actuals: docs.map((a) => ({
      id: String(a._id),
      month: a.month,
      amountCents: a.amountCents,
      note: a.note,
      categoryId: String(a.categoryId),
      categoryName: nameById.get(String(a.categoryId)) ?? "Unknown",
      createdAt: a.createdAt,
      locked: lockedMonths.has(a.month),
    })),
  });
});

export const POST = withAuth(async ({ user, req }) => {
  const { month: rawMonth, categoryId, amount, note } = await parseBody(req, actualSchema);
  const month = assertMonth(rawMonth);
  const category = await requireOwnedCategory(user.id, categoryId);
  const amountCents = toCents(amount, "amount");

  await assertMonthUnlocked(user.id, month);

  const doc = await Actual.create({
    userId: toObjectId(user.id)!,
    categoryId: toObjectId(category.id)!,
    month,
    amountCents,
    note: note || null,
  });

  return jsonOk(
    {
      actual: {
        id: String(doc._id),
        month: doc.month,
        amountCents: doc.amountCents,
        note: doc.note,
        categoryId: String(doc.categoryId),
        categoryName: category.name,
        createdAt: doc.createdAt,
      },
    },
    201,
  );
});

export const DELETE = withAuth(async ({ user, req }) => {
  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  if (!month) throw new ValidationError("month query parameter is required");
  assertMonth(month);
  const categoryId = url.searchParams.get("categoryId");
  const categoryFilter = categoryId ? toObjectId(categoryId) : null;

  await assertMonthUnlocked(user.id, month);

  const deleteQuery: Record<string, any> = {
    userId: toObjectId(user.id)!,
    month,
  };
  if (categoryFilter) {
    deleteQuery.categoryId = categoryFilter;
  }

  const result = await Actual.deleteMany(deleteQuery);
  return jsonOk({ deleted: result.deletedCount });
});
