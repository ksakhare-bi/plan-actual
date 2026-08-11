import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { loadEnv } from "./loadEnv";
import { User } from "../src/models/User";
import { Category } from "../src/models/Category";
import { Plan } from "../src/models/Plan";
import { Actual } from "../src/models/Actual";
import { PeriodLock } from "../src/models/PeriodLock";
import { ensureIndexes, closeClient } from "../src/lib/db";

loadEnv();

const DEMO_EMAIL = process.env.SEED_EMAIL ?? "one@one.com";
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "demo1234";

const CATEGORIES = ["Marketing", "Payroll", "Tools"];

const PLANS: [month: string, category: string, amount: number][] = [
  ["2026-01", "Marketing", 5000],
  ["2026-01", "Payroll", 20000],
  ["2026-02", "Marketing", 5000],
  ["2026-02", "Payroll", 20000],
  ["2026-03", "Marketing", 5000],
  ["2026-03", "Payroll", 20000],
  ["2026-03", "Tools", 0],
];

const ACTUALS: [month: string, category: string, amount: number, note?: string][] = [
  ["2026-01", "Marketing", 4800, "Q1 campaign"],
  ["2026-01", "Payroll", 20500],
  ["2026-02", "Payroll", 19800],
  ["2026-03", "Marketing", 3000, "Conference sponsorship"],
  ["2026-03", "Marketing", 1500, "Ad spend"],
  ["2026-03", "Payroll", 20000],
  ["2026-03", "Tools", 250, "New seat licences"],
];

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and add your MongoDB Atlas string.");
  }

  await ensureIndexes();

  const now = new Date();

  await User.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      $set: {
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
        updatedAt: now,
      },
      $setOnInsert: {
        email: DEMO_EMAIL,
        createdAt: now,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const user = (await User.findOne({ email: DEMO_EMAIL }))!;
  const userId = user._id;

  
  await Actual.deleteMany({ userId });
  await Plan.deleteMany({ userId });
  await PeriodLock.deleteMany({ userId });

  const categoryId = new Map<string, mongoose.Types.ObjectId>();
  for (const name of CATEGORIES) {
    const cat = await Category.findOneAndUpdate(
      { userId, name },
      { $setOnInsert: { createdAt: now } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    categoryId.set(name, cat._id);
  }

  const planDocs = PLANS.map(([month, category, amount]) => ({
    userId,
    categoryId: categoryId.get(category)!,
    month,
    amountCents: Math.round(amount * 100),
    createdAt: now,
    updatedAt: now,
  }));
  await Plan.insertMany(planDocs);

  const actualDocs = ACTUALS.map(([month, category, amount, note]) => ({
    userId,
    categoryId: categoryId.get(category)!,
    month,
    amountCents: Math.round(amount * 100),
    note: note ?? null,
    createdAt: now,
    updatedAt: now,
  }));
  await Actual.insertMany(actualDocs);

  
  await PeriodLock.create({ userId, month: "2026-01", lockedAt: now });

  console.log(`Seeded ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  ${planDocs.length} plans, ${actualDocs.length} actuals, 2026-01 locked`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(closeClient);
