import { ApiError, jsonOk, parseBody, withPublic } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { credentialsSchema } from "@/lib/schemas";
import { seedDefaultCategories } from "@/lib/categories";
import { User } from "@/models/User";

export const POST = withPublic(async (req) => {
  const { email, password } = await parseBody(req, credentialsSchema);

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw new ApiError(
      "conflict",
      "An account with that email already exists.",
      "Sign in instead, or use a different email address.",
      { email: ["This email is already registered."] },
    );
  }

  const user = await User.create({ email, passwordHash: await hashPassword(password) });

  await seedDefaultCategories(String(user._id));

  await createSession({ userId: String(user._id), email: user.email });

  return jsonOk({ user: { id: String(user._id), email: user.email } }, 201);
});
