import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { encode } from 'next-auth/jwt';
import { adminSessionCookieName, hasAdminSession } from './admin-session';

const SECRET = 'test-auth-secret';
const previousAuthSecret = process.env.AUTH_SECRET;
const previousAuthUrl = process.env.AUTH_URL;

afterEach(() => {
  if (previousAuthSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = previousAuthSecret;
  if (previousAuthUrl === undefined) delete process.env.AUTH_URL;
  else process.env.AUTH_URL = previousAuthUrl;
});

async function sessionCookie(userId: string | undefined, secret = SECRET) {
  process.env.AUTH_URL = 'http://localhost:5001';
  const cookieName = adminSessionCookieName(false);
  const token = await encode({
    token: userId ? { userId, sub: userId } : { sub: 'missing-user' },
    secret,
    salt: cookieName,
  });
  return { cookieName, token };
}

describe('hasAdminSession', () => {
  it('accepts a valid admin session cookie', async () => {
    process.env.AUTH_SECRET = SECRET;
    const { cookieName, token } = await sessionCookie('admin-1');
    const headers = new Headers({ cookie: `${cookieName}=${token}` });
    assert.equal(await hasAdminSession(headers), true);
  });

  it('rejects anonymous requests, tampered cookies, and non-session bearer tokens', async () => {
    process.env.AUTH_SECRET = SECRET;
    process.env.AUTH_URL = 'http://localhost:5001';
    assert.equal(await hasAdminSession(new Headers()), false);

    const { cookieName, token } = await sessionCookie('admin-1');
    const tampered = new Headers({ cookie: `${cookieName}=${token}x` });
    assert.equal(await hasAdminSession(tampered), false);

    const bearer = new Headers({ authorization: 'Bearer api-token-not-a-session' });
    assert.equal(await hasAdminSession(bearer), false);
  });

  it('rejects a session cookie when AUTH_SECRET is unset', async () => {
    delete process.env.AUTH_SECRET;
    process.env.AUTH_URL = 'http://localhost:5001';
    const { cookieName, token } = await sessionCookie('admin-1');
    process.env.AUTH_SECRET = undefined;
    delete process.env.AUTH_SECRET;
    const headers = new Headers({ cookie: `${cookieName}=${token}` });
    assert.equal(await hasAdminSession(headers), false);
  });
});
