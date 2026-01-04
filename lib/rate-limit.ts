const buckets = new Map<string, number[]>();

export function assertRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entries = buckets.get(key) ?? [];
  const filtered = entries.filter((timestamp) => now - timestamp < windowMs);
  if (filtered.length >= limit) {
    throw new Error('Too many requests. Please slow down.');
  }
  filtered.push(now);
  buckets.set(key, filtered);
}
