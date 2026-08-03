import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Accepts an identity established by an upstream single sign-on proxy.
 *
 * When this app sits behind a proxy that already authenticated the caller
 * (Authelia, Cloudflare Access, oauth2-proxy), asking for a second password is
 * pointless friction — the user has already proved who they are.
 *
 * SECURITY: Remote-Email is only trustworthy because the proxy *overwrites* it
 * on every request; a client cannot set it themselves. That guarantee holds
 * only while the app is unreachable except through the proxy. If the app also
 * listens on a published port, anyone could send the header directly and
 * become any user, so TRUST_PROXY_AUTH must stay off in that case.
 */
export function proxyAuthEnabled(): boolean {
  return process.env.TRUST_PROXY_AUTH === "true";
}

export async function getProxyUserId(): Promise<string | null> {
  if (!proxyAuthEnabled()) return null;

  const incoming = await headers();
  const email = incoming.get("remote-email")?.trim().toLowerCase();
  if (!email) return null;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return existing.id;

  // First arrival through the proxy. The proxy owns the password, so this
  // account deliberately has no usable local one: a random hash that no input
  // can match, rather than an empty string that a bug might treat as valid.
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash: `sso-only:${crypto.randomUUID()}`,
    },
    select: { id: true },
  });
  return created.id;
}
