import { ApiError, jsonOk, parseBody, withPublic } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { credentialsSchema } from "@/lib/schemas";
import { User } from "@/models/User";

export const POST = withPublic(async (req) => {
  const { email, password } = await parseBody(req, credentialsSchema);

  const user = await User.findOne({ email }).select("+passwordHash");

  const ok = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !ok) {
    throw new ApiError(
      "unauthorized",
      "Email or password is incorrect.",
      "Check your details and try again.",
    );
  }

  await createSession({ userId: String(user._id), email: user.email });
  return jsonOk({ user: { id: String(user._id), email: user.email } });
});
