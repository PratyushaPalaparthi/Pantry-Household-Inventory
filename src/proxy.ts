import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";

// An upstream single sign-on proxy forwards the authenticated user on this
// header. Seeing it means the caller already proved who they are, so sending
// them to this app's own login would be pure friction.
//
// Trustworthy only because the proxy overwrites the header on every request,
// which holds while the app is unreachable except through that proxy. See
// lib/proxy-auth.ts for the full reasoning.
function hasProxyIdentity(req: NextRequest): boolean {
  return process.env.TRUST_PROXY_AUTH === "true" && Boolean(req.headers.get("remote-email"));
}

const guarded = withAuth(
  function proxy() {
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
  }
);

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  if (hasProxyIdentity(req)) return NextResponse.next();
  // withAuth's signature asks for a request that already carries `nextauth`,
  // but it is withAuth itself that attaches that during the call. A plain
  // NextRequest is what it actually receives at runtime.
  return guarded(req as NextRequestWithAuth, event);
}

export const config = {
  // Protect everything except the auth pages/APIs and Next/PWA internals.
  // (Next 16 renamed this file convention from `middleware` to `proxy`.)
  // Uploaded files are served via /api/files, which is covered by this
  // matcher AND independently re-checks the session in the route handler.
  matcher: [
    "/((?!login|signup|api/auth|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|offline.html).*)",
  ],
};
