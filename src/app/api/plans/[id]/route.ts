import { ApiError, jsonOk, withAuth } from "@/lib/api";
import { Plan, type PlanDoc } from "@/models/Plan";
import { toObjectId } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { assertMonthUnlocked } from "@/lib/locks";
import { toCents } from "@/lib/money";

async function loadOwnedPlan(userId: string, id: string): Promise<PlanDoc> {
  const planId = toObjectId(id);
  const ownerId = toObjectId(userId);
  if (!planId || !ownerId) throw new NotFoundError("Plan not found");

  const plan = await Plan.findOne({ _id: planId, userId: ownerId });
  if (!plan) throw new NotFoundError("Plan not found");
  return plan;
}

export const PATCH = withAuth<{ id: string }>(async ({ user, req, params }) => {
  const { id } = params;
  const plan = await loadOwnedPlan(user.id, id);

  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new ApiError("validation_error", "Request body must be valid JSON.");
  }

  await assertMonthUnlocked(user.id, plan.month);

  const amountCents = toCents(body.amount, "amount");

  const updated = await Plan.findOneAndUpdate(
    { _id: plan._id },
    { amountCents },
    { new: true },
  ).lean();

  return jsonOk({
    plan: {
      id: String(updated!._id),
      month: updated!.month,
      amountCents: updated!.amountCents,
      categoryId: String(updated!.categoryId),
    },
  });
});

export const DELETE = withAuth<{ id: string }>(async ({ user, params }) => {
  const { id } = params;
  const plan = await loadOwnedPlan(user.id, id);

  await assertMonthUnlocked(user.id, plan.month);

  await Plan.deleteOne({ _id: plan._id });
  return jsonOk({ ok: true });
});
