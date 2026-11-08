import "server-only";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 40;
const MAX_TRACKED = 5_000;

const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * Best-effort limit per caller. It lives in one server process, so with several instances each
 * has its own count. It stops a runaway client using up the free geocoding allowance.
 */
export function isRateLimited(caller: string, now = Date.now()): boolean {
  if (hits.size > MAX_TRACKED) {
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }
  const entry = hits.get(caller);
  if (!entry || entry.resetAt <= now) {
    hits.set(caller, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}
