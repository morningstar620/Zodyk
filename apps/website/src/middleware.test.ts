import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

const env = process.env as Record<string, string | undefined>;
const previousNodeEnv = env.NODE_ENV;

afterEach(() => {
  if (previousNodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = previousNodeEnv;
});

function setCookies(response: Response): string[] {
  return response.headers.getSetCookie();
}

function run(url: string, nodeEnv: string) {
  env.NODE_ENV = nodeEnv;
  return middleware(new NextRequest(url));
}

describe('preview cookies', () => {
  it('sets Secure cookies with a 15 minute TTL in production and removes the query secrets', () => {
    const response = run(
      'http://shop.example/pages/about?preview=1&preview_theme=theme1&preview_token=abc123&keep=1',
      'production',
    );
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get('location') ?? '');
    assert.equal(location.pathname, '/pages/about');
    assert.equal(location.searchParams.get('preview'), '1');
    assert.equal(location.searchParams.get('keep'), '1');
    assert.equal(location.searchParams.has('preview_theme'), false);
    assert.equal(location.searchParams.has('preview_token'), false);

    const cookies = setCookies(response);
    assert.equal(cookies.length, 2);
    for (const cookie of cookies) {
      assert.match(cookie, /Max-Age=900/i);
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /;\s*Secure(?:;|$)/i);
      assert.match(cookie, /SameSite=lax/i);
    }
    assert.match(cookies[0] ?? '', /zodyk_preview_theme=theme1/);
    assert.match(cookies[1] ?? '', /zodyk_preview_token=abc123/);
  });

  it('omits Secure outside production', () => {
    const response = run(
      'http://shop.example/?preview_theme=theme1&preview_token=abc123',
      'development',
    );
    const cookies = setCookies(response);
    assert.equal(cookies.length, 2);
    for (const cookie of cookies) {
      assert.doesNotMatch(cookie, /;\s*Secure(?:;|$)/i);
    }
  });

  it('does not redirect asset requests that still need the preview query', () => {
    const response = run(
      'http://shop.example/assets/app.css?preview_theme=theme1&preview_token=abc123',
      'production',
    );
    assert.equal(response.headers.get('location'), null);
    assert.equal(setCookies(response).length, 2);
  });

  it('strips unsafe query secrets without storing them', () => {
    const response = run(
      'http://shop.example/?preview_theme=theme1&preview_token=bad%20token',
      'production',
    );
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get('location') ?? '').searchParams.has('preview_token'), false);
    assert.equal(setCookies(response).length, 0);
  });
});
