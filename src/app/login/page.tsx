import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

// Server component so an already-signed-in visitor is redirected before any
// form is rendered — showing a sign-in form to someone who is already signed in
// reads as "my session broke" and invites a pointless re-login.
//
// The form itself is a client component wrapped in Suspense because it reads
// ?callbackUrl= via useSearchParams().
export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

  // When an owner already exists there is nothing to sign up for, so offer the
  // password-reset route instead of a link that just bounces back here.
  const ownerExists = (await prisma.user.count()) > 0;

  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center" />}>
      <LoginForm ownerExists={ownerExists} />
    </Suspense>
  );
}
