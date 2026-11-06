import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderErrorResponse } from './error-page';

describe('renderErrorResponse', () => {
  it('returns a fixed page that does not reflect error text', async () => {
    const response = renderErrorResponse();

    assert.equal(response.status, 500);
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');

    const body = await response.text();
    assert.match(body, /Site temporarily unavailable/);
    assert.doesNotMatch(body, /<script/i);
    assert.doesNotMatch(body, /alert\(1\)/);
  });
});
