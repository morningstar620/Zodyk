import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { themeAssetCacheControl, themeAssetResponse } from './asset-cache';

const previewAsset = {
  content: 'console.log("draft")',
  contentType: 'application/javascript',
  isPreview: true,
};

const liveAsset = {
  content: 'console.log("live")',
  contentType: 'application/javascript',
  isPreview: false,
};

describe('themeAssetCacheControl', () => {
  it('does not let shared caches store a preview asset', () => {
    assert.equal(themeAssetCacheControl(true), 'private, no-store');
  });

  it('keeps a public cache for live theme assets', () => {
    assert.equal(themeAssetCacheControl(false), 'public, max-age=3600');
  });
});

describe('themeAssetResponse', () => {
  it('marks a preview asset response as private and no-store', () => {
    const response = themeAssetResponse(previewAsset);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  });

  it('keeps a live asset publicly cacheable', () => {
    const response = themeAssetResponse(liveAsset);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=3600');
  });

  it('returns 404 without a cacheable body when the asset is missing', () => {
    const response = themeAssetResponse(null);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), null);
  });
});
