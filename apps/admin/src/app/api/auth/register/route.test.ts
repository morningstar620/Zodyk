import { beforeEach, describe, expect, it, vi } from 'vitest';

const resetPassword = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('@zodyk/auth', async () => {
  const { AuthError } = await import('../../../../../../../packages/auth/src/rbac/middleware');
  const { assertResetPasswordRateLimit } =
    await import('../../../../../../../packages/auth/src/security/reset-password-limit');
  const rateLimit = await import('../../../../../../../packages/auth/src/security/rate-limit');
  return {
    AuthError,
    assertResetPasswordRateLimit,
    checkRateLimit: rateLimit.checkRateLimit,
    getRateLimitKey: rateLimit.getRateLimitKey,
    clearRateLimits: rateLimit.clearRateLimits,
    registerUser: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword,
  };
});

import { clearRateLimits } from '@zodyk/auth';
import { POST } from './route';

describe('POST /api/auth/register reset-password', () => {
  beforeEach(() => {
    clearRateLimits();
    resetPassword.mockReset().mockResolvedValue(undefined);
  });

  async function reset(ip: string, token = 'reset-token') {
    return POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({
          action: 'reset-password',
          token,
          password: 'Password1!',
        }),
      }),
    );
  }

  it('returns 429 after the limit and stops resetting the password', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await reset('203.0.113.4', `token-${attempt}`);
      expect(response.status).toBe(200);
    }

    const limited = await reset('203.0.113.4', 'token-extra');
    expect(limited.status).toBe(429);
    expect(resetPassword).toHaveBeenCalledTimes(5);
  });

  it('returns 429 when one reset token is tried from many addresses', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await reset(`198.51.100.${attempt}`, 'shared-token');
      expect(response.status).toBe(200);
    }

    const limited = await reset('198.51.100.20', 'shared-token');
    expect(limited.status).toBe(429);
    expect(resetPassword).toHaveBeenCalledTimes(5);
  });
});
