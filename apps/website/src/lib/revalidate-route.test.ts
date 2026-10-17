import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { POST } from '../app/api/revalidate/route';

const env = process.env as Record<string, string | undefined>;
const previousNodeEnv = env.NODE_ENV;
const previousSecret = env.REVALIDATE_SECRET;

afterEach(() => {
  if (previousNodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = previousNodeEnv;
  if (previousSecret === undefined) delete env.REVALIDATE_SECRET;
  else env.REVALIDATE_SECRET = previousSecret;
});

async function post(authorization?: string) {
  const headers = new Headers();
  if (authorization) headers.set('authorization', authorization);
  const response = await POST(
    new Request('http://shop.example/api/revalidate', { method: 'POST', headers }),
  );
  return { status: response.status, body: await response.json() };
}

describe('POST /api/revalidate', () => {
  it('returns 503 in production when the secret is unset', async () => {
    env.NODE_ENV = 'production';
    delete env.REVALIDATE_SECRET;
    const result = await post();
    assert.equal(result.status, 503);
    assert.equal(result.body.error, 'Revalidate secret is not configured');
  });

  it('returns 401 in production without the bearer secret', async () => {
    env.NODE_ENV = 'production';
    env.REVALIDATE_SECRET = 'theme-secret';
    const missing = await post();
    const wrong = await post('Bearer other');
    assert.equal(missing.status, 401);
    assert.equal(wrong.status, 401);
  });

  it('flushes the cache when the bearer token matches', async () => {
    env.NODE_ENV = 'production';
    env.REVALIDATE_SECRET = 'theme-secret';
    const result = await post('Bearer theme-secret');
    assert.equal(result.status, 200);
    assert.equal(result.body.revalidated, true);
  });
});
