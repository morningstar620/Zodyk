import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PREVIEW_COOKIE_MAX_AGE_SECONDS,
  isSafePreviewParam,
  previewCookieOptions,
} from './preview-cookies';

describe('previewCookieOptions', () => {
  it('sets Secure only in production and keeps a short TTL', () => {
    assert.equal(previewCookieOptions('production').secure, true);
    assert.equal(previewCookieOptions('development').secure, false);
    assert.equal(previewCookieOptions(undefined).secure, false);
    assert.equal(previewCookieOptions('production').maxAge, PREVIEW_COOKIE_MAX_AGE_SECONDS);
    assert.ok(PREVIEW_COOKIE_MAX_AGE_SECONDS <= 15 * 60);
    assert.equal(previewCookieOptions('production').httpOnly, true);
    assert.equal(previewCookieOptions('production').sameSite, 'lax');
  });
});

describe('isSafePreviewParam', () => {
  it('accepts theme ids and hex tokens and rejects injected cookie values', () => {
    assert.equal(isSafePreviewParam('64b7a1c2e4f0aa11bb22cc33'), true);
    assert.equal(isSafePreviewParam('a'.repeat(48)), true);
    assert.equal(isSafePreviewParam('bad token'), false);
    assert.equal(isSafePreviewParam('a;b'), false);
    assert.equal(isSafePreviewParam(''), false);
  });
});
