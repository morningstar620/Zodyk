import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  clearRateLimits,
  getRateLimitKey,
} from './rate-limit';

describe('Rate limiter security', () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it('blocks the sixth registration attempt for the same trusted IP', async () => {
    const trustedIp = '127.0.0.1';

    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(
        getRateLimitKey('register', trustedIp),
      );
      expect(result.success).toBe(true);
    }

    const sixthAttempt = await checkRateLimit(
      getRateLimitKey('register', trustedIp),
    );

    expect(sixthAttempt.success).toBe(false);
  });
  it('does not allow the in-memory rate-limit map to exceed MAX_KEYS', async () => {
  for (let i = 0; i < 10_000; i++) {
    const result = await checkRateLimit(`capacity-test-${i}`);
    expect(result.success).toBe(true);
  }

  const overflow = await checkRateLimit('capacity-test-overflow');

  expect(overflow.success).toBe(false);
});
});