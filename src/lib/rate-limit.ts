interface RateEntry {
  count: number;
  resetAt: number;
}

const entries = new Map<string, RateEntry>();

export function rateLimit(key: string, maximum: number, windowMs: number, now = Date.now()): boolean {
  const existing = entries.get(key);
  if (!existing || existing.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= maximum) return false;
  existing.count += 1;
  return true;
}

export function resetRateLimitsForTests(): void {
  entries.clear();
}
