/**
 * In-memory sliding-window rate limiter for public landing page.
 * 5 analyses per IP per hour.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Map<string, Window>>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export function checkRateLimit(
  key: string,
  namespace: string,
  limit: number,
  windowSec: number
): RateLimitResult {
  if (!store.has(namespace)) store.set(namespace, new Map());
  const ns = store.get(namespace)!;
  const now = Date.now();
  const existing = ns.get(key);

  if (!existing || now >= existing.resetAt) {
    ns.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, retryAfterSec: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true, retryAfterSec: 0 };
}

export function getClientKey(req: { headers: { get: (k: string) => string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
