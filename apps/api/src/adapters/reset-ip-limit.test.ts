import { beforeEach, describe, expect, it } from 'vitest';
import { getClientIp, setTrustedClientIp } from '../../../../packages/api/src/request-context';
import { assertResetPasswordRateLimit } from '../../../../packages/auth/src/security/reset-password-limit';
import { clearRateLimits } from '../../../../packages/auth/src/security/rate-limit';

describe('Password reset trusted IP rate limit', () => {
  beforeEach(() => clearRateLimits());

  it('shares the IP limit when forwarded headers change', async () => {
    for (let i = 1; i <= 6; i++) {
      const request = new Request('http://localhost/reset-password', {
        headers: {
          'X-Forwarded-For': `203.0.113.${i}`,
        },
      });

      // Simulate the IP resolved by Express.
      setTrustedClientIp(request, '127.0.0.1');

      const trustedIp = getClientIp(request) ?? 'unknown';

      if (i <= 5) {
        await expect(
          assertResetPasswordRateLimit(trustedIp, `unique-token-${i}`),
        ).resolves.toBeUndefined();
      } else {
        await expect(
          assertResetPasswordRateLimit(trustedIp, 'unique-token-6'),
        ).rejects.toThrow('Too many requests');
      }
    }
  });
});