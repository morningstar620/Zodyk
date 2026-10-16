import { beforeEach, describe, expect, it } from 'vitest';
import { AuthError } from '../rbac/middleware';
import { clearRateLimits } from './rate-limit';
import { assertResetPasswordRateLimit } from './reset-password-limit';

describe('assertResetPasswordRateLimit', () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it('returns 429 after the per-IP limit', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await assertResetPasswordRateLimit('10.0.0.1', `token-${attempt}`);
    }

    await expect(assertResetPasswordRateLimit('10.0.0.1', 'token-fresh')).rejects.toMatchObject({
      status: 429,
      message: 'Too many requests',
    });
  });

  it('returns 429 for one token across IP addresses', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await assertResetPasswordRateLimit(`10.0.0.${attempt}`, 'same-token');
    }

    try {
      await assertResetPasswordRateLimit('10.9.9.9', 'same-token');
      expect.fail('expected rate limit');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).status).toBe(429);
    }
  });
});
