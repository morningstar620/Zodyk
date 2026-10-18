import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { invalidateWebsiteCache, revalidateRequestInit } from './website-cache';

describe('revalidateRequestInit', () => {
  it('sends the bearer token when a secret is configured', () => {
    const init = revalidateRequestInit('  theme-secret  ');
    const headers = new Headers(init.headers);
    assert.equal(init.method, 'POST');
    assert.equal(headers.get('authorization'), 'Bearer theme-secret');
  });

  it('omits Authorization when the secret is unset', () => {
    const init = revalidateRequestInit('   ');
    const headers = new Headers(init.headers);
    assert.equal(headers.get('authorization'), null);
  });
});

describe('invalidateWebsiteCache', () => {
  it('posts the bearer token to the website revalidate route', async () => {
    const calls: Array<{ url: string; authorization: string | null }> = [];
    await invalidateWebsiteCache(
      { websiteUrl: 'https://shop.example/', revalidateSecret: 's3cret' },
      async (url, init) => {
        calls.push({
          url,
          authorization: new Headers(init?.headers).get('authorization'),
        });
        return new Response(JSON.stringify({ revalidated: true }), { status: 200 });
      },
    );

    assert.deepEqual(calls, [
      {
        url: 'https://shop.example/api/revalidate',
        authorization: 'Bearer s3cret',
      },
    ]);
  });

  it('swallows network failures so a down website does not fail publish', async () => {
    await assert.doesNotReject(() =>
      invalidateWebsiteCache({ websiteUrl: 'https://shop.example', revalidateSecret: 's3cret' }, async () => {
        throw new Error('offline');
      }),
    );
  });
});
