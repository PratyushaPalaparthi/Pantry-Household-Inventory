import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SignupForm } from "@/components/SignupForm";

// Signup is single-use: the first account becomes the owner and the endpoint
// closes permanently. Deciding that here, on the server, means a visitor who
// can never sign up is told so up front instead of filling in a form that is
// guaranteed to fail.
export default async function SignupPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

  const ownerExists = (await prisma.user.count()) > 0;
  if (ownerExists) redirect("/login?signupClosed=1");

  return <SignupForm />;
}
