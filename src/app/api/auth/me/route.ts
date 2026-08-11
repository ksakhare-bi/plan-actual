import { jsonOk, withAuth } from "@/lib/api";

export const GET = withAuth(async ({ user }) =>
  jsonOk({ user: { id: user.id, email: user.email } }),
);
