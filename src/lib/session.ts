import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProxyUserId, proxyAuthEnabled } from "@/lib/proxy-auth";

export async function getUserId(): Promise<string | null> {
  // Behind a single sign-on proxy the caller has already proved who they are,
  // so that identity wins and no second login is asked for. Checked first
  // because in that setup there is no NextAuth session to find at all.
  if (proxyAuthEnabled()) {
    const proxyUserId = await getProxyUserId();
    if (proxyUserId) return proxyUserId;
  }

  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
