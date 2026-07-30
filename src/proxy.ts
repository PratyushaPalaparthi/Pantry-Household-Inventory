import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy() {
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
  }
);

export const config = {
  // Protect everything except the auth pages/APIs and Next/PWA internals.
  // (Next 16 renamed this file convention from `middleware` to `proxy`.)
  // Uploaded files are served via /api/files, which is covered by this
  // matcher AND independently re-checks the session in the route handler.
  matcher: [
    "/((?!login|signup|api/auth|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|offline.html).*)",
  ],
};
