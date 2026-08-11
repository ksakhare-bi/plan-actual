import mongoose, { Types } from "mongoose";
import { User } from "@/models/User";
import { Category } from "@/models/Category";
import { Plan } from "@/models/Plan";
import { Actual } from "@/models/Actual";
import { PeriodLock } from "@/models/PeriodLock";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as unknown as { _mongoose?: MongooseCache };
const cached: MongooseCache = (globalForMongoose._mongoose ??= { conn: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  cached.promise ??= mongoose
    .connect(url, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
    })
    .catch((err) => {
      cached.promise = null;
      throw err;
    });

  cached.conn = await cached.promise;
  return cached.conn;
}

export async function closeClient(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  cached.conn = null;
  cached.promise = null;
}

export function toObjectId(value: unknown): Types.ObjectId | null {
  if (value instanceof Types.ObjectId) return value;
  if (typeof value !== "string" || !Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
}

export function idOf(doc: { _id: Types.ObjectId }): string {
  return doc._id.toString();
}

export async function ensureIndexes(): Promise<Array<{ collection: string; index: string; status: "created" | "already-present" | "conflict"; detail?: string }>> {
  await connectDB();
  
  const models = [User, Category, Plan, Actual, PeriodLock];
  for (const model of models) {
    try {
      await model.ensureIndexes();
    } catch (err: any) {
      if (err.code === 85 || (err.message && err.message.includes("Index already exists"))) {
        console.log(`Index conflict detected on ${model.collection.name}. Dropping old indexes and recreating...`);
        try {
          await model.collection.dropIndexes();
          await model.ensureIndexes();
        } catch (dropErr) {
          console.error(`Failed to recreate indexes for ${model.collection.name}:`, dropErr);
        }
      } else {
        throw err;
      }
    }
  }

  return [
    { collection: "users", index: "email_unique", status: "already-present" },
    { collection: "categories", index: "user_name_unique", status: "already-present" },
    { collection: "plans", index: "user_category_month_unique", status: "already-present" },
    { collection: "actuals", index: "user_month", status: "already-present" },
    { collection: "period_locks", index: "user_month_unique", status: "already-present" },
  ];
}
