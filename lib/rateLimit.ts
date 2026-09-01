/**
 * Per-instance, in-memory sliding-window rate limiter.
 *
 * Honest limitation: this state lives in the Node process's memory, so on a
 * multi-instance deployment (e.g. multiple Vercel serverless invocations)
 * each instance enforces its own independent limit rather than one shared
 * global limit. That's a real gap for a distributed production deployment —
 * closing it properly needs a shared store (Redis/Upstash). This is still a
 * genuine, working defense against a single client hammering one instance,
 * which is what a prototype actually needs.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return { allowed: false, remaining: 0 };
  }
  timestamps.push(now);
  buckets.set(key, timestamps);
  // Bound memory growth for long-lived processes: drop stale keys occasionally.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t > windowMs)) buckets.delete(k);
    }
  }
  return { allowed: true, remaining: limit - timestamps.length };
}

export function rateLimitKey(req: Request, userId: string): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${userId}:${ip}`;
}
