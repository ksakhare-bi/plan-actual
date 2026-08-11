import { jsonOk, withAuth } from "@/lib/api";
import { Plan } from "@/models/Plan";
import { Actual } from "@/models/Actual";
import { toObjectId } from "@/lib/db";

export const GET = withAuth(async ({ user }) => {
  const owner = toObjectId(user.id)!;
  const projection = { month: 1 };

  const [planMin, planMax, actualMin, actualMax] = await Promise.all([
    Plan.findOne({ userId: owner }).select(projection).sort({ month: 1 }).lean(),
    Plan.findOne({ userId: owner }).select(projection).sort({ month: -1 }).lean(),
    Actual.findOne({ userId: owner }).select(projection).sort({ month: 1 }).lean(),
    Actual.findOne({ userId: owner }).select(projection).sort({ month: -1 }).lean(),
  ]);

  const mins = [planMin?.month, actualMin?.month].filter((m): m is string => !!m);
  const maxs = [planMax?.month, actualMax?.month].filter((m): m is string => !!m);

  return jsonOk({
    firstMonth: mins.length ? mins.sort()[0] : null,
    lastMonth: maxs.length ? maxs.sort().at(-1)! : null,
  });
});
