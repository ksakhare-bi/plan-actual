import { Category } from "@/models/Category";
import { Plan } from "@/models/Plan";
import { Actual } from "@/models/Actual";
import { toObjectId } from "./db";
import { listLockedMonths } from "./locks";
import { assertMonth, ValidationError } from "./period";
import { buildReport, type ActualRow, type PlanRow, type Report } from "./report";

export interface RangeInput {
  from: string;
  to: string;
}

export function parseRange(url: URL): RangeInput {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) throw new ValidationError("from and to query parameters are required (YYYY-MM)");
  assertMonth(from, "from");
  assertMonth(to, "to");
  if (from > to) throw new ValidationError(`from (${from}) must not be after to (${to})`);
  return { from, to };
}

interface GroupedCell {
  _id: { categoryId: any; month: string };
  amountCents: number;
  entryCount: number;
}

const groupByCell = (userId: ReturnType<typeof toObjectId>, from: string, to: string) => [
  { $match: { userId, month: { $gte: from, $lte: to } } },
  {
    $group: {
      _id: { categoryId: "$categoryId", month: "$month" },
      amountCents: { $sum: "$amountCents" },
      entryCount: { $sum: 1 },
    },
  },
];

export async function loadReport(userId: string, { from, to }: RangeInput): Promise<Report> {
  const owner = toObjectId(userId);
  if (!owner) {
    throw new ValidationError("invalid user id");
  }
  const pipeline = groupByCell(owner, from, to);

  const [categoryDocs, planCells, actualCells, lockedMonths] = await Promise.all([
    Category.find({ userId: owner }).select("name").lean(),
    Plan.aggregate<GroupedCell>(pipeline),
    Actual.aggregate<GroupedCell>(pipeline),
    listLockedMonths(userId, from, to),
  ]);

  const planRows: PlanRow[] = planCells.map((c) => ({
    categoryId: String(c._id.categoryId),
    month: c._id.month,
    amountCents: c.amountCents,
  }));

  const actualRows: ActualRow[] = actualCells.map((c) => ({
    categoryId: String(c._id.categoryId),
    month: c._id.month,
    amountCents: c.amountCents,
    entryCount: c.entryCount,
  }));

  return buildReport({
    from,
    to,
    categories: categoryDocs.map((c) => ({ id: String(c._id), name: c.name })),
    plans: planRows,
    actuals: actualRows,
    lockedMonths,
  });
}
