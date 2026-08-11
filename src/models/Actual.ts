import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ActualDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
  month: string;
  amountCents: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ActualSchema = new Schema<ActualDoc>(
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
    note: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

ActualSchema.index({ userId: 1, month: 1 }, { name: "user_month" });
ActualSchema.index({ userId: 1, categoryId: 1, month: 1 }, { name: "user_category_month" });

export const Actual: Model<ActualDoc> =
  (mongoose.models.Actual as Model<ActualDoc>) ?? mongoose.model<ActualDoc>("Actual", ActualSchema);
