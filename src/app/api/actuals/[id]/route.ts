import { ApiError, jsonOk, withAuth } from "@/lib/api";
import { requireOwnedCategory } from "@/lib/categories";
import { Actual, type ActualDoc } from "@/models/Actual";
import { toObjectId } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { assertMonthUnlocked } from "@/lib/locks";
import { toCents } from "@/lib/money";
import { assertMonth } from "@/lib/period";

async function loadOwnedActual(userId: string, id: string): Promise<ActualDoc> {
  const actualId = toObjectId(id);
  const ownerId = toObjectId(userId);
  if (!actualId || !ownerId) throw new NotFoundError("Actual not found");

  const actual = await Actual.findOne({ _id: actualId, userId: ownerId });
  if (!actual) throw new NotFoundError("Actual not found");
  return actual;
}

export const PATCH = withAuth<{ id: string }>(async ({ user, req, params }) => {
  const { id } = params;
  const actual = await loadOwnedActual(user.id, id);

  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new ApiError("validation_error", "Request body must be valid JSON.");
  }

  await assertMonthUnlocked(user.id, actual.month);

  const nextMonth = body.month === undefined ? actual.month : assertMonth(body.month);
  if (nextMonth !== actual.month) {
    await assertMonthUnlocked(user.id, nextMonth);
  }

  const nextCategoryId =
    body.categoryId === undefined
      ? actual.categoryId
      : toObjectId((await requireOwnedCategory(user.id, body.categoryId)).id)!;

  const updateFields: Record<string, any> = {
    month: nextMonth,
    categoryId: nextCategoryId,
  };

  if (body.amount !== undefined) {
    updateFields.amountCents = toCents(body.amount, "amount");
  }
  if (body.note !== undefined) {
    updateFields.note =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim().slice(0, 500)
        : null;
  }

  const updated = await Actual.findOneAndUpdate(
    { _id: actual._id },
    { $set: updateFields },
    { new: true },
  ).lean();

  return jsonOk({
    actual: {
      id: String(updated!._id),
      month: updated!.month,
      amountCents: updated!.amountCents,
      note: updated!.note,
      categoryId: String(updated!.categoryId),
    },
  });
});

export const DELETE = withAuth<{ id: string }>(async ({ user, params }) => {
  const { id } = params;
  const actual = await loadOwnedActual(user.id, id);

  await assertMonthUnlocked(user.id, actual.month);

  await Actual.deleteOne({ _id: actual._id });
  return jsonOk({ ok: true });
});
