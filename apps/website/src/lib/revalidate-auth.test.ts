import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { authorizeRevalidate } from './revalidate-auth';

describe('authorizeRevalidate', () => {
  it('fails closed in production when the secret is unset', () => {
    const decision = authorizeRevalidate({
      authorization: null,
      secret: undefined,
      nodeEnv: 'production',
    });
    assert.deepEqual(decision, {
      ok: false,
      status: 503,
      error: 'Revalidate secret is not configured',
    });
  });

  it('fails closed in production when the secret is blank', () => {
    const decision = authorizeRevalidate({
      authorization: 'Bearer ',
      secret: '   ',
      nodeEnv: 'production',
    });
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.status, 503);
  });

  it('returns 401 in production when the bearer token is missing or wrong', () => {
    for (const authorization of [null, 'Bearer wrong', 'secret']) {
      const decision = authorizeRevalidate({
        authorization,
        secret: 'theme-secret',
        nodeEnv: 'production',
      });
      assert.deepEqual(decision, { ok: false, status: 401, error: 'Unauthorized' });
    }
  });

  it('allows the matching bearer token', () => {
    const decision = authorizeRevalidate({
      authorization: 'Bearer theme-secret',
      secret: ' theme-secret ',
      nodeEnv: 'production',
    });
    assert.deepEqual(decision, { ok: true });
  });

  it('stays open in development only when the secret is unset', () => {
    assert.deepEqual(
      authorizeRevalidate({
        authorization: null,
        secret: undefined,
        nodeEnv: 'development',
      }),
      { ok: true },
    );
    assert.deepEqual(
      authorizeRevalidate({
        authorization: null,
        secret: 'theme-secret',
        nodeEnv: 'development',
      }),
      { ok: false, status: 401, error: 'Unauthorized' },
    );
  });
});
