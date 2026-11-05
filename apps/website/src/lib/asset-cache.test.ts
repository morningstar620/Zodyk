import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { themeAssetCacheControl } from './asset-cache';

describe('themeAssetCacheControl', () => {
  it('does not let shared caches store a preview asset', () => {
    assert.equal(themeAssetCacheControl(true), 'private, no-store');
  });

  it('keeps a public cache for live theme assets', () => {
    assert.equal(themeAssetCacheControl(false), 'public, max-age=3600');
  });
});
