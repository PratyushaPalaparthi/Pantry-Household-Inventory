const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * How many reverse proxies sit in front of the app (your own proxy = 1; add one
 * for a CDN/tunnel in front of it, e.g. Cloudflare + Caddy = 2).
 */
const TRUSTED_PROXY_HOPS = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1));

const IP_LIKE = /^[0-9a-fA-F:.]{3,45}$/;

/**
 * Client IP for rate limiting, read from the *trusted* end of X-Forwarded-For.
 *
 * This must not use the raw header. XFF is a comma list where each proxy appends
 * the address it received the request from, so the leftmost entries are whatever
 * the client sent and are freely forgeable. Keying the limiter on the whole
 * header let an internet attacker mint a fresh bucket per request — sending a
 * different XFF each time — which removed the login lockout completely.
 *
 * Counting back TRUSTED_PROXY_HOPS entries from the right lands on the address
 * our own infrastructure observed, which the client cannot influence.
 */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (hops.length > 0) {
      const index = Math.max(0, hops.length - TRUSTED_PROXY_HOPS);
      const candidate = hops[index];
      if (candidate && IP_LIKE.test(candidate)) return candidate;
    }
  }

  // Set by nginx-style proxies; also single-valued, so not a list to walk.
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp && IP_LIKE.test(realIp)) return realIp;

  // No proxy headers at all — direct access, e.g. localhost during development.
  return "direct";
}

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Single source of truth for the bucket key. If the login handler and the
// status endpoint derived this separately they could drift and read different
// buckets, which would silently break lockout reporting.
export function rateLimitKeyFor(ip: string, email: string): string {
  return `${ip}:${email.toLowerCase()}`;
}

// Single-process in-memory limiter. Fine for a self-hosted single-instance
// deployment; would need a shared store (e.g. Redis) behind a load balancer.
export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function resetLoginRateLimit(key: string) {
  buckets.delete(key);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, WINDOW_MS).unref();
