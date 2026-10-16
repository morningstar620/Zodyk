import { beforeEach, describe, expect, it, vi } from 'vitest';

const { AuthError, disableMfa, auth } = vi.hoisted(() => {
  class AuthError extends Error {
    status: number;
    constructor(message: string, status = 401) {
      super(message);
      this.name = 'AuthError';
      this.status = status;
    }
  }
  return {
    AuthError,
    disableMfa: vi.fn(async () => {}),
    auth: vi.fn(),
  };
});

vi.mock('@zodyk/auth', () => ({
  AuthError,
  auth,
  disableMfa,
  enableMfa: vi.fn(),
  generateMfaQrCode: vi.fn(),
  generateMfaSecret: vi.fn(),
}));

import { POST } from './route';

describe('POST /api/auth/mfa/setup disable', () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({
      userId: 'user-1',
      user: { email: 'ada@example.com' },
    });
    disableMfa.mockReset().mockResolvedValue(undefined);
  });

  it('returns 401 when no second factor is provided', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/mfa/setup', {
        method: 'POST',
        body: JSON.stringify({ action: 'disable' }),
      }),
    );

    expect(response.status).toBe(401);
    expect(disableMfa).not.toHaveBeenCalled();
  });

  it('returns 401 when the second factor is rejected', async () => {
    disableMfa.mockRejectedValue(
      new AuthError('Invalid authenticator code, backup code, or password', 401),
    );

    const response = await POST(
      new Request('http://localhost/api/auth/mfa/setup', {
        method: 'POST',
        body: JSON.stringify({ action: 'disable', password: 'wrong' }),
      }),
    );

    expect(response.status).toBe(401);
    expect(disableMfa).toHaveBeenCalledWith('user-1', {
      code: undefined,
      password: 'wrong',
    });
  });
});
