import { PeriodLock } from "@/models/PeriodLock";
import { toObjectId } from "./db";
import { PeriodLockedError } from "./errors";
import { assertMonth, quarterMonths } from "./period";

export async function listLockedMonths(userId: string, from?: string, to?: string): Promise<string[]> {
  const owner = toObjectId(userId);
  if (!owner) return [];

  const query: Record<string, any> = { userId: owner };
  if (from && to) {
    query.month = { $gte: from, $lte: to };
  }

  const docs = await PeriodLock.find(query).select("month").sort({ month: 1 }).lean();
  return docs.map((d) => d.month);
}

export async function isMonthLocked(userId: string, month: string): Promise<boolean> {
  assertMonth(month);
  const owner = toObjectId(userId);
  if (!owner) return false;

  const doc = await PeriodLock.findOne({ userId: owner, month }).select("_id").lean();
  return doc !== null;
}

export async function assertMonthUnlocked(userId: string, month: string): Promise<void> {
  if (await isMonthLocked(userId, month)) throw new PeriodLockedError(month);
}

export async function lockMonth(userId: string, month: string): Promise<void> {
  assertMonth(month);
  const owner = toObjectId(userId);
  if (!owner) return;

  try {
    await PeriodLock.findOneAndUpdate(
      { userId: owner, month },
      { $setOnInsert: { lockedAt: new Date() } },
      { upsert: true },
    );
  } catch (err) {
    
    if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
      return;
    }
    throw err;
  }
}

export async function unlockMonth(userId: string, month: string): Promise<void> {
  assertMonth(month);
  const owner = toObjectId(userId);
  if (!owner) return;

  await PeriodLock.deleteOne({ userId: owner, month });
}

export async function lockQuarter(userId: string, year: number, quarter: number): Promise<string[]> {
  const months = quarterMonths(year, quarter);
  for (const month of months) {
    await lockMonth(userId, month);
  }
  return months;
}

export async function unlockQuarter(userId: string, year: number, quarter: number): Promise<string[]> {
  const months = quarterMonths(year, quarter);
  const owner = toObjectId(userId);
  if (!owner) return [];

  await PeriodLock.deleteMany({ userId: owner, month: { $in: months } });
  return months;
}
