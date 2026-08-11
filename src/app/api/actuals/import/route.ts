import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { jsonOk, withAuth } from "@/lib/api";
import { createCategory } from "@/lib/categories";
import { parseActualsCsv } from "@/lib/csv";
import { toObjectId } from "@/lib/db";
import { listLockedMonths } from "@/lib/locks";
import { ValidationError } from "@/lib/period";
import { Category } from "@/models/Category";
import { Actual } from "@/models/Actual";

export const POST = withAuth(async ({ user, req }) => {
  const owner = toObjectId(user.id)!;
  const contentType = req.headers.get("content-type") ?? "";

  let csv = "";
  let mode = "append";
  let createMissingCategories = false;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ValidationError("file is required");
    csv = await file.text();
    mode = String(form.get("mode") ?? "append");
    createMissingCategories = String(form.get("createMissingCategories") ?? "") === "true";
  } else {
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }
    if (typeof body.csv !== "string") throw new ValidationError("csv (string) is required");
    csv = body.csv;
    mode = body.mode ?? "append";
    createMissingCategories = body.createMissingCategories === true;
  }

  if (mode !== "append" && mode !== "replace") {
    throw new ValidationError('mode must be "append" or "replace"');
  }

  let categoryDocs = await Category.find({ userId: owner }).select("name").lean();

  let parsed = parseActualsCsv(csv, categoryDocs.map((c) => c.name));

  if (createMissingCategories) {
    const unknown = new Set<string>();
    const known = new Set(categoryDocs.map((c) => c.name.toLowerCase()));
    for (const e of parsed.errors) {
      const m = /^Unknown category "(.*)"$/.exec(e.message);
      if (m && !known.has(m[1].toLowerCase())) unknown.add(m[1]);
    }
    for (const name of unknown) {
      await createCategory(user.id, name);
    }
    if (unknown.size > 0) {
      categoryDocs = await Category.find({ userId: owner }).select("name").lean();
      parsed = parseActualsCsv(csv, categoryDocs.map((c) => c.name));
    }
  }

  if (parsed.errors.length > 0) {
    return NextResponse.json(
      {
        error: `Import rejected: ${parsed.errors.length} invalid row(s). Nothing was imported.`,
        code: "CSV_VALIDATION_ERROR",
        details: { errors: parsed.errors, validRows: parsed.rows.length },
      },
      { status: 400 },
    );
  }
  if (parsed.rows.length === 0) {
    throw new ValidationError("No data rows found in CSV");
  }

  const idByName = new Map(categoryDocs.map((c) => [c.name.toLowerCase(), c._id]));
  const targetMonths = [...new Set(parsed.rows.map((r) => r.month))].sort();

  const lockedTargets = (await listLockedMonths(user.id)).filter((m) => targetMonths.includes(m));
  if (lockedTargets.length > 0) {
    return NextResponse.json(
      {
        error: `Import rejected: period(s) ${lockedTargets.join(", ")} are locked. Nothing was imported.`,
        code: "PERIOD_LOCKED",
        details: { months: lockedTargets },
      },
      { status: 423 },
    );
  }

  const now = new Date();
  const docs = parsed.rows.map((r) => ({
    userId: owner,
    categoryId: idByName.get(r.category.toLowerCase())!,
    month: r.month,
    amountCents: r.amountCents,
    note: r.note ?? null,
    createdAt: now,
    updatedAt: now,
  }));

  const session = await mongoose.startSession();
  let replaced = 0;

  try {
    await session.withTransaction(async () => {
      replaced = 0;

      if (mode === "replace") {
        const pairs = [...new Set(docs.map((d) => `${d.month}|${d.categoryId}`))].map((k) => {
          const [month, categoryId] = k.split("|");
          return { month, categoryId: toObjectId(categoryId) };
        });
        for (const pair of pairs) {
          const res = await Actual.deleteMany({ userId: owner, ...pair }).session(session);
          replaced += res.deletedCount;
        }
      }

      await Actual.insertMany(docs, { session });
    });
  } finally {
    await session.endSession();
  }

  return jsonOk(
    { imported: docs.length, replaced, months: targetMonths, mode },
    201,
  );
});
