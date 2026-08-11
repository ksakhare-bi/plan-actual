import { jsonOk, parseBody, withAuth } from "@/lib/api";
import { createCategory, listCategories } from "@/lib/categories";
import { categorySchema } from "@/lib/schemas";

export const GET = withAuth(async ({ user }) => {
  const categories = await listCategories(user.id);
  return jsonOk({ categories });
});

export const POST = withAuth(async ({ user, req }) => {
  const { name } = await parseBody(req, categorySchema);
  const category = await createCategory(user.id, name);
  return jsonOk({ category }, 201);
});
