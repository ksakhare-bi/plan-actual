import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectDB, closeClient, toObjectId } from "@/lib/db";
import { PeriodLockedError, toErrorResponse } from "@/lib/errors";
import { User } from "@/models/User";
import { Category } from "@/models/Category";
import { Plan } from "@/models/Plan";
import { Actual } from "@/models/Actual";
import { PeriodLock } from "@/models/PeriodLock";
import {
  assertMonthUnlocked,
  isMonthLocked,
  listLockedMonths,
  lockMonth,
  lockQuarter,
  unlockMonth,
  unlockQuarter,
} from "@/lib/locks";

const enabled = process.env.PVA_DB_TESTS !== "off";
const describeDb = enabled ? describe : describe.skip;

let userId: mongoose.Types.ObjectId;
let otherUserId: mongoose.Types.ObjectId;
let marketingId: mongoose.Types.ObjectId;

const planDoc = (month: string, amountCents: number) => ({
  userId,
  categoryId: marketingId,
  month,
  amountCents,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const actualDoc = (month: string, amountCents: number) => ({
  userId,
  categoryId: marketingId,
  month,
  amountCents,
  note: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

beforeAll(async () => {
  if (!enabled) return;

  await connectDB();

  await PeriodLock.deleteMany({});
  await Actual.deleteMany({});
  await Plan.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({});

  userId = new mongoose.Types.ObjectId();
  otherUserId = new mongoose.Types.ObjectId();
  marketingId = new mongoose.Types.ObjectId();
  const now = new Date();

  await User.insertMany([
    { _id: userId, email: "lock-test@example.com", passwordHash: "x", createdAt: now },
    { _id: otherUserId, email: "other@example.com", passwordHash: "x", createdAt: now },
  ]);
  await Category.create({ _id: marketingId, userId, name: "Marketing", createdAt: now });
});

beforeEach(async () => {
  if (!enabled) return;
  await PeriodLock.deleteMany({});
  await Actual.deleteMany({});
  await Plan.deleteMany({});
});

afterAll(async () => {
  if (enabled) await closeClient();
});

describeDb("lock state", () => {
  it("starts unlocked", async () => {
    expect(await isMonthLocked(userId.toHexString(), "2026-01")).toBe(false);
    await expect(assertMonthUnlocked(userId.toHexString(), "2026-01")).resolves.toBeUndefined();
  });

  it("locks and unlocks a month", async () => {
    await lockMonth(userId.toHexString(), "2026-01");
    expect(await isMonthLocked(userId.toHexString(), "2026-01")).toBe(true);
    await unlockMonth(userId.toHexString(), "2026-01");
    expect(await isMonthLocked(userId.toHexString(), "2026-01")).toBe(false);
  });

  it("locking twice is idempotent", async () => {
    await lockMonth(userId.toHexString(), "2026-01");
    await lockMonth(userId.toHexString(), "2026-01");
    expect(await listLockedMonths(userId.toHexString())).toEqual(["2026-01"]);
    expect(await PeriodLock.countDocuments({ userId, month: "2026-01" })).toBe(1);
  });

  it("leaves neighbouring months open", async () => {
    await lockMonth(userId.toHexString(), "2026-01");
    expect(await isMonthLocked(userId.toHexString(), "2026-02")).toBe(false);
    expect(await isMonthLocked(userId.toHexString(), "2025-12")).toBe(false);
  });

  it("scopes locks per user", async () => {
    await lockMonth(userId.toHexString(), "2026-01");
    expect(await isMonthLocked(otherUserId.toHexString(), "2026-01")).toBe(false);
    await expect(assertMonthUnlocked(otherUserId.toHexString(), "2026-01")).resolves.toBeUndefined();
  });

  it("filters listLockedMonths by range", async () => {
    for (const m of ["2025-12", "2026-01", "2026-02", "2026-05"]) await lockMonth(userId.toHexString(), m);
    expect(await listLockedMonths(userId.toHexString(), "2026-01", "2026-03")).toEqual(["2026-01", "2026-02"]);
  });
});

describeDb("quarter locking expands to months", () => {
  it("locks all three months of the quarter", async () => {
    await lockQuarter(userId.toHexString(), 2026, 1);
    expect(await listLockedMonths(userId.toHexString())).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(await isMonthLocked(userId.toHexString(), "2026-04")).toBe(false);
  });

  it("allows reopening a single month of a locked quarter", async () => {
    await lockQuarter(userId.toHexString(), 2026, 1);
    await unlockMonth(userId.toHexString(), "2026-02");
    expect(await listLockedMonths(userId.toHexString())).toEqual(["2026-01", "2026-03"]);
    await expect(assertMonthUnlocked(userId.toHexString(), "2026-02")).resolves.toBeUndefined();
    await expect(assertMonthUnlocked(userId.toHexString(), "2026-01")).rejects.toThrow(PeriodLockedError);
  });

  it("unlocks a whole quarter", async () => {
    await lockQuarter(userId.toHexString(), 2026, 1);
    await unlockQuarter(userId.toHexString(), 2026, 1);
    expect(await listLockedMonths(userId.toHexString())).toEqual([]);
  });
});

describeDb("assertMonthUnlocked blocks writes", () => {
  beforeEach(async () => {
    await lockMonth(userId.toHexString(), "2026-01");
  });

  it("throws PeriodLockedError naming the month", async () => {
    await expect(assertMonthUnlocked(userId.toHexString(), "2026-01")).rejects.toThrow(PeriodLockedError);
    await expect(assertMonthUnlocked(userId.toHexString(), "2026-01")).rejects.toThrow(
      /Period 2026-01 is locked/,
    );
  });

  it("maps to HTTP 423 with code PERIOD_LOCKED", async () => {
    const err = await assertMonthUnlocked(userId.toHexString(), "2026-01").catch((e) => e);
    const res = toErrorResponse(err);
    expect(res.status).toBe(423);
    const body = await res.json();
    expect(body).toMatchObject({ code: "PERIOD_LOCKED", details: { month: "2026-01" } });
    expect(body.error).toMatch(/locked/i);
  });

  it("blocks creating a plan in a locked month", async () => {
    await expect(
      (async () => {
        await assertMonthUnlocked(userId.toHexString(), "2026-01");
        await Plan.create(planDoc("2026-01", 500000));
      })(),
    ).rejects.toThrow(PeriodLockedError);
    expect(await Plan.countDocuments({})).toBe(0);
  });

  it("blocks editing a plan that already exists in a locked month", async () => {
    await unlockMonth(userId.toHexString(), "2026-01");
    const plan = await Plan.create(planDoc("2026-01", 500000));
    await lockMonth(userId.toHexString(), "2026-01");

    await expect(assertMonthUnlocked(userId.toHexString(), plan.month)).rejects.toThrow(PeriodLockedError);
    expect((await Plan.findOne({ _id: plan._id }))!.amountCents).toBe(500000);
  });

  it("blocks logging an actual in a locked month but allows an open one", async () => {
    await expect(assertMonthUnlocked(userId.toHexString(), "2026-01")).rejects.toThrow(PeriodLockedError);
    await expect(assertMonthUnlocked(userId.toHexString(), "2026-02")).resolves.toBeUndefined();
    await Actual.create(actualDoc("2026-02", 100));
    expect(await Actual.countDocuments({})).toBe(1);
  });

  it("blocks moving an actual INTO a locked month", async () => {
    const actual = await Actual.create(actualDoc("2026-02", 100));
    await expect(assertMonthUnlocked(userId.toHexString(), actual.month)).resolves.toBeUndefined();
    await expect(assertMonthUnlocked(userId.toHexString(), "2026-01")).rejects.toThrow(PeriodLockedError);
  });

  it("blocks deleting from a locked month", async () => {
    await unlockMonth(userId.toHexString(), "2026-01");
    const actual = await Actual.create(actualDoc("2026-01", 100));
    await lockMonth(userId.toHexString(), "2026-01");

    await expect(assertMonthUnlocked(userId.toHexString(), actual.month)).rejects.toThrow(PeriodLockedError);
    expect(await Actual.countDocuments({})).toBe(1);
  });

  it("allows writes again after unlocking", async () => {
    await unlockMonth(userId.toHexString(), "2026-01");
    await assertMonthUnlocked(userId.toHexString(), "2026-01");
    await Plan.create(planDoc("2026-01", 1));
    expect(await Plan.countDocuments({})).toBe(1);
  });

  it("rejects a malformed month before touching the database", async () => {
    await expect(assertMonthUnlocked(userId.toHexString(), "2026-1")).rejects.toThrow(/YYYY-MM/);
  });
});
