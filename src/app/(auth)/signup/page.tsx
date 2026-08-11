import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getUser } from "@/lib/auth";

export default async function SignupPage() {
  if (await getUser()) redirect("/report");
  return <AuthForm mode="signup" />;
}
