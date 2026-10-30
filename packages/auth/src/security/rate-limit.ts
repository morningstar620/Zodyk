interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

function removeExpiredEntries(now: number): void {
  for (const [key, entry] of memoryStore) {
    if (entry.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  const now = Date.now();
  const entry = memoryStore.get(key);

  // Existing active key: preserve its current counter.
  if (entry && entry.resetAt > now) {
    if (entry.count >= MAX_REQUESTS) {
      return {
        success: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    entry.count += 1;

    return {
      success: true,
      remaining: MAX_REQUESTS - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // Remove expired keys before adding a new one.
  removeExpiredEntries(now);

  // Fail closed rather than allowing the Map to grow indefinitely.
  if (memoryStore.size >= MAX_KEYS) {
    let earliestReset = Infinity;

    for (const item of memoryStore.values()) {
      earliestReset = Math.min(earliestReset, item.resetAt);
    }

    return {
      success: false,
      remaining: 0,
      resetAt: earliestReset,
    };
  }

  const resetAt = now + WINDOW_MS;
  memoryStore.set(key, { count: 1, resetAt });

  return {
    success: true,
    remaining: MAX_REQUESTS - 1,
    resetAt,
  };
}

export function getRateLimitKey(action: string, identifier: string): string {
  return `${action}:${identifier}`;
}

export function clearRateLimits(): void {
  memoryStore.clear();
}