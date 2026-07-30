"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FormAlert } from "@/components/FormAlert";

/**
 * Where to go after a successful sign-in.
 *
 * The middleware appends ?callbackUrl=... when it bounces an unauthenticated
 * request, so honouring it returns you to the page you actually asked for.
 * Only same-origin relative paths are accepted — echoing an arbitrary URL back
 * into a redirect is an open-redirect hole.
 */
function safeCallbackUrl(raw: string | null): string {
  if (!raw) return "/";

  // Reject protocol-relative ("//evil.com") and absolute URLs outright.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";

  // Never bounce straight back to an auth page — that would loop.
  const path = raw.split("?")[0];
  if (path === "/login" || path === "/signup") return "/";

  return raw;
}

export function LoginForm({ ownerExists }: { ownerExists: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signupClosed = searchParams.get("signupClosed") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      // A rejected password surfaces as the opaque "CredentialsSignin"; anything
      // else (e.g. the rate limiter's lockout message) is thrown by authorize()
      // and passed through verbatim, so show it as-is.
      setError(
        result.error === "CredentialsSignin"
          ? "Invalid email or password. Forgotten it? Run \"npm run set-password\" to set a new one."
          : result.error
      );
      return;
    }
    router.push(safeCallbackUrl(searchParams.get("callbackUrl")));
    router.refresh();
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl">🏠</div>
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted">Sign in to your household inventory</p>
        </div>

        {signupClosed && (
          <p
            className="mb-4 rounded-lg border p-3 text-sm"
            style={{
              borderColor: "color-mix(in srgb, var(--brand) 40%, transparent)",
              background: "var(--brand-soft)",
            }}
          >
            This app already has an owner account, so signup is closed. Sign in below.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <FormAlert>{error}</FormAlert>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {ownerExists ? (
          <p className="mt-6 text-center text-xs text-muted">
            This app has one owner account and signup is closed. Forgotten the password? Run{" "}
            <code className="rounded px-1" style={{ background: "var(--brand-soft)" }}>
              npm run set-password
            </code>{" "}
            where the app is running.
          </p>
        ) : (
          <p className="mt-6 text-center text-sm text-muted">
            First time here?{" "}
            <Link href="/signup" className="font-medium" style={{ color: "var(--brand)" }}>
              Create the owner account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
