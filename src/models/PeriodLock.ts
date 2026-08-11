import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface PeriodLockDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  month: string;
  lockedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PeriodLockSchema = new Schema<PeriodLockDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
    },
    lockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

PeriodLockSchema.index({ userId: 1, month: 1 }, { unique: true, name: "user_month_unique" });

export const PeriodLock: Model<PeriodLockDoc> =
  (mongoose.models.PeriodLock as Model<PeriodLockDoc>) ??
  mongoose.model<PeriodLockDoc>("PeriodLock", PeriodLockSchema, "period_locks");
