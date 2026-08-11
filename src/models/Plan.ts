import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface PlanDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
  month: string;
  amountCents: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<PlanDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    month: {
      type: String,
      required: true,
    },
    amountCents: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

PlanSchema.index({ userId: 1, categoryId: 1, month: 1 }, { unique: true, name: "user_category_month_unique" });
PlanSchema.index({ userId: 1, month: 1 }, { name: "user_month" });

export const Plan: Model<PlanDoc> =
  (mongoose.models.Plan as Model<PlanDoc>) ?? mongoose.model<PlanDoc>("Plan", PlanSchema);
