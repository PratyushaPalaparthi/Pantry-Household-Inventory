const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

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
