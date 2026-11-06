import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRateLimits,
  checkRateLimit,
  getRateLimitKey,
} from '../../../../packages/auth/src/security/rate-limit';
import {
  getClientIp,
  setTrustedClientIp,
} from '../../../../packages/api/src/request-context';

describe('Registration IP rate limit', () => {
  beforeEach(() => clearRateLimits());

  it('blocks the sixth attempt despite changing X-Forwarded-For', async () => {
    const statuses: number[] = [];

    for (let i = 1; i <= 6; i++) {
      const request = new Request('http://localhost/api/v1/auth/register', {
        headers: {
          'X-Forwarded-For': `203.0.113.${i}`,
        },
      });

      // Same Express-resolved client IP for all six requests.
      setTrustedClientIp(request, '127.0.0.1');

      const ip = getClientIp(request) ?? 'unknown';
      const result = await checkRateLimit(getRateLimitKey('register', ip));

      statuses.push(result.success ? 201 : 429);
    }

    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });
});