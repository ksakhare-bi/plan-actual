import { z } from "zod";

const monthRegex = /^\d{4}-(?:0[1-9]|1[0-2])$/;

export const credentialsSchema = z.object({
  email: z.email("Enter a valid email address").max(255).toLowerCase().trim(),
  password: z
    .string({ message: "Required" })
    .min(8, "Use at least 8 characters")
    .max(200, "Use at most 200 characters"),
});

export const categorySchema = z.object({
  name: z
    .string({ message: "category name is required" })
    .trim()
    .min(1, "category name must not be empty")
    .max(60, "category name must be at most 60 characters"),
});

export const planSchema = z.object({
  categoryId: z.string({ message: "categoryId is required" }).min(1, "categoryId is required"),
  month: z.string({ message: "month is required" }).regex(monthRegex, "month must be in YYYY-MM format"),
  amount: z
    .number({ message: "amount is required" })
    .finite("amount must be a number")
    .nonnegative("amount must not be negative"),
});

export const actualSchema = z.object({
  categoryId: z.string({ message: "categoryId is required" }).min(1, "categoryId is required"),
  month: z.string({ message: "month is required" }).regex(monthRegex, "month must be in YYYY-MM format"),
  amount: z
    .number({ message: "amount is required" })
    .finite("amount must be a number")
    .nonnegative("amount must not be negative"),
  note: z.string().trim().max(1000, "note is too long").nullable().optional(),
});

export const lockSchema = z.object({
  month: z.string().regex(monthRegex, "month must be in YYYY-MM format").optional(),
  year: z.number().int().min(1970).max(3000).optional(),
  quarter: z.number().int().min(1).max(4).optional(),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
