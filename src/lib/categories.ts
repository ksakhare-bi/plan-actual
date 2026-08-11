import { Category } from "@/models/Category";
import { toObjectId } from "./db";
import { ConflictError, NotFoundError } from "./errors";
import { ValidationError } from "./period";

export const DEFAULT_CATEGORIES = ["Marketing", "Payroll", "Tools", "Travel", "Contractors"];

export interface CategoryDto {
  id: string;
  name: string;
  createdAt?: Date;
}

export function normalizeCategoryName(input: unknown): string {
  if (typeof input !== "string") throw new ValidationError("category name is required");
  const name = input.trim().replace(/\s+/g, " ");
  if (name.length === 0) throw new ValidationError("category name must not be empty");
  if (name.length > 60) throw new ValidationError("category name must be at most 60 characters");
  return name;
}

export async function listCategories(userId: string): Promise<CategoryDto[]> {
  const owner = toObjectId(userId);
  if (!owner) return [];
  const docs = await Category.find({ userId: owner }).sort({ name: 1 }).lean();
  return docs.map((d) => ({
    id: String(d._id),
    name: d.name,
    createdAt: d.createdAt,
  }));
}

export async function createCategory(userId: string, nameInput: unknown): Promise<CategoryDto> {
  const name = normalizeCategoryName(nameInput);
  const owner = toObjectId(userId);
  if (!owner) throw new ValidationError("invalid user id");

  
  const existing = await Category.find({ userId: owner }).select("name").lean();
  const clash = existing.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (clash) throw new ConflictError(`Category "${clash.name}" already exists`);

  try {
    const doc = await Category.create({ userId: owner, name });
    return {
      id: String(doc._id),
      name: doc.name,
      createdAt: doc.createdAt,
    };
  } catch (err) {
    if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
      throw new ConflictError(`Category "${name}" already exists`);
    }
    throw err;
  }
}

export async function requireOwnedCategory(userId: string, categoryId: unknown): Promise<CategoryDto> {
  const id = toObjectId(categoryId);
  const owner = toObjectId(userId);
  if (!id || !owner) throw new NotFoundError("Category not found");

  const doc = await Category.findOne({ _id: id, userId: owner }).lean();
  if (!doc) throw new NotFoundError("Category not found");

  return {
    id: String(doc._id),
    name: doc.name,
    createdAt: doc.createdAt,
  };
}

export async function seedDefaultCategories(userId: string): Promise<void> {
  const owner = toObjectId(userId);
  if (!owner) return;
  const now = new Date();
  
  const docs = DEFAULT_CATEGORIES.map((name) => ({
    userId: owner,
    name,
    createdAt: now,
  }));
  await Category.insertMany(docs);
}
