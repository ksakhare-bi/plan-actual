import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface CategoryDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<CategoryDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

CategorySchema.index({ userId: 1, name: 1 }, { unique: true, name: "user_name_unique" });

export const Category: Model<CategoryDoc> =
  (mongoose.models.Category as Model<CategoryDoc>) ?? mongoose.model<CategoryDoc>("Category", CategorySchema);
