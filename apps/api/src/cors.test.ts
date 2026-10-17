import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isCorsOriginAllowed } from './cors';

const evil = 'https://evil.example';
const admin = 'http://localhost:5001';

describe('isCorsOriginAllowed', () => {
  it('allows non-browser requests that send no Origin', () => {
    assert.equal(
      isCorsOriginAllowed({
        origin: undefined,
        allowedOrigins: [],
        nodeEnv: 'production',
      }),
      true,
    );
  });

  it('rejects an unknown Origin in production when the allow-list is empty', () => {
    assert.equal(
      isCorsOriginAllowed({
        origin: evil,
        allowedOrigins: [],
        nodeEnv: 'production',
      }),
      false,
    );
  });

  it('rejects an unknown Origin when the allow-list is non-empty', () => {
    assert.equal(
      isCorsOriginAllowed({
        origin: evil,
        allowedOrigins: [admin],
        nodeEnv: 'production',
      }),
      false,
    );
    assert.equal(
      isCorsOriginAllowed({
        origin: evil,
        allowedOrigins: [admin],
        nodeEnv: 'development',
      }),
      false,
    );
  });

  it('allows a configured origin', () => {
    assert.equal(
      isCorsOriginAllowed({
        origin: admin,
        allowedOrigins: [admin],
        nodeEnv: 'production',
      }),
      true,
    );
  });

  it('keeps an empty allow-list open in local development', () => {
    assert.equal(
      isCorsOriginAllowed({
        origin: evil,
        allowedOrigins: [],
        nodeEnv: 'development',
      }),
      true,
    );
    assert.equal(
      isCorsOriginAllowed({
        origin: evil,
        allowedOrigins: [],
        nodeEnv: undefined,
      }),
      true,
    );
  });
});
