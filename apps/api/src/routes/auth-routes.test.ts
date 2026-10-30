
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { once } from 'node:events';
import { createAuthRouter } from './auth-routes';

const mocks = vi.hoisted(() => ({
  registerUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

const rateLimitAttempts = vi.hoisted(() => new Map<string, number>());

const MockAuthError = vi.hoisted(() => {
  return class MockAuthError extends Error {
    status: number;

    constructor(message: string, status = 429) {
      super(message);
      this.status = status;
    }
  };
});

vi.mock('@zodyk/auth', () => ({
  AuthError: MockAuthError,

  assertResetPasswordRateLimit: vi.fn(async (ip: string, _token: string) => {
    const key = `reset-password:${ip}`;
    const count = resetAttempts.get(key) ?? 0;

    resetAttempts.set(key, count + 1);

    if (count >= 5) {
      throw new MockAuthError('Too many requests', 429);
    }
  }),

  checkRateLimit: vi.fn(async (key: string) => {
    const count = rateLimitAttempts.get(key) ?? 0;
    rateLimitAttempts.set(key, count + 1);

    return { success: count < 5 };
  }),

  getRateLimitKey: vi.fn(
    (action: string, ip: string) => `${action}:${ip}`,
  ),

  registerUser: mocks.registerUser,
  requestPasswordReset: mocks.requestPasswordReset,
  resetPassword: mocks.resetPassword,
}));

const resetAttempts = vi.hoisted(() => new Map<string, number>());


describe('authentication HTTP rate limits', () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    rateLimitAttempts.clear();
    resetAttempts.clear();
    mocks.registerUser.mockReset();
    mocks.requestPasswordReset.mockReset();
    mocks.resetPassword.mockReset();

    mocks.registerUser.mockResolvedValue({ id: 'test-user' });
    mocks.requestPasswordReset.mockResolvedValue(undefined);
    mocks.resetPassword.mockResolvedValue(undefined);

    process.env.ALLOW_REGISTRATION = 'true';

    const app = express();

    // Simulate the production trust-proxy configuration.
    app.set('trust proxy', 0);

    // Capture the resolved IP using the same adapter as production.
    // The route adapter creates its own Web Request, so set the
    // trusted IP through Express's resolved req.ip in the adapter.
    app.use(express.json());

    app.use(createAuthRouter());

    server = app.listen(0);
    await once(server, 'listening');

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Could not start test server');
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    delete process.env.ALLOW_REGISTRATION;
  });

  async function post(body: unknown, forwardedIp: string) {
    return fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': forwardedIp,
      },
      body: JSON.stringify(body),
    });
  }

  it('blocks the sixth registration attempt from the same client IP', async () => {
    const statuses: number[] = [];

    for (let i = 1; i <= 6; i++) {
      const response = await post(
        {
          action: 'register',
          name: `Test User ${i}`,
          email: `user${i}@example.com`,
          password: 'StrongPass123!',
        },
        `203.0.113.${i}`,
      );

      statuses.push(response.status);
    }

    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
    expect(mocks.registerUser).toHaveBeenCalledTimes(5);
  });

  it('uses the same IP bucket for password reset despite forwarded headers', async () => {
    const statuses: number[] = [];

    for (let i = 1; i <= 6; i++) {
      const response = await post(
        {
          action: 'reset-password',
          token: `unique-token-${i}`,
          password: 'StrongPass123!',
        },
        `203.0.113.${i}`,
      );

      statuses.push(response.status);
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(mocks.resetPassword).toHaveBeenCalledTimes(5);
  });
});
