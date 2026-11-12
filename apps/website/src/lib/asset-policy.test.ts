import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ACTIVE_ASSET_CSP, themeAssetHeaders } from './asset-policy';

describe('themeAssetHeaders', () => {
  it('leaves inert assets alone apart from nosniff', () => {
    const headers = themeAssetHeaders('image/png', { cacheControl: 'public, max-age=3600' });

    assert.equal(headers['Content-Type'], 'image/png');
    assert.equal(headers['Cache-Control'], 'public, max-age=3600');
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
    assert.equal(headers['Content-Disposition'], undefined);
    assert.equal(headers['Content-Security-Policy'], undefined);
    assert.equal(headers['Vary'], undefined);
  });

  it('keeps SVG renderable for image subresource requests', () => {
    const headers = themeAssetHeaders('image/svg+xml', { dest: 'image' });

    assert.equal(headers['Content-Type'], 'image/svg+xml');
    assert.equal(headers['Content-Disposition'], undefined);
    assert.equal(headers['Content-Security-Policy'], ACTIVE_ASSET_CSP);
    assert.equal(headers['Cache-Control'], 'public, max-age=3600');
    assert.equal(headers['Vary'], 'Sec-Fetch-Dest');
  });

  it('serves SVG as text for navigation, iframe, object, embed, and fetch', () => {
    for (const dest of ['document', 'iframe', 'frame', 'object', 'embed', 'empty', 'other']) {
      const headers = themeAssetHeaders('image/svg+xml', { dest, filename: 'assets/logo.svg' });

      assert.equal(headers['Content-Type'], 'text/plain; charset=utf-8', `dest=${dest}`);
      assert.equal(headers['Content-Disposition'], 'attachment; filename="logo.svg"', `dest=${dest}`);
      assert.equal(headers['Cache-Control'], 'private, no-store', `dest=${dest}`);
      assert.equal(headers['Content-Security-Policy'], ACTIVE_ASSET_CSP, `dest=${dest}`);
      assert.equal(headers['Vary'], 'Sec-Fetch-Dest', `dest=${dest}`);
    }
  });

  it('keeps the SVG type but forces a download when the client sends no destination', () => {
    for (const dest of [null, undefined, '']) {
      const headers = themeAssetHeaders('image/svg+xml', { dest, filename: 'assets/logo.svg' });

      assert.equal(headers['Content-Type'], 'image/svg+xml', `dest=${dest}`);
      assert.equal(headers['Content-Disposition'], 'attachment; filename="logo.svg"', `dest=${dest}`);
      assert.equal(headers['Cache-Control'], 'private, no-store', `dest=${dest}`);
      assert.equal(headers['Content-Security-Policy'], ACTIVE_ASSET_CSP, `dest=${dest}`);
    }
  });

  it('never serves HTML as HTML', () => {
    for (const type of ['text/html', 'application/xhtml+xml']) {
      const headers = themeAssetHeaders(type, { dest: 'document', filename: 'evil.html' });

      assert.equal(headers['Content-Type'], 'text/plain; charset=utf-8', type);
      assert.equal(headers['Content-Disposition'], 'attachment; filename="evil.html"', type);
      assert.equal(headers['Cache-Control'], 'private, no-store', type);
      assert.equal(headers['X-Content-Type-Options'], 'nosniff', type);
      assert.equal(headers['Content-Security-Policy'], ACTIVE_ASSET_CSP, type);
    }
  });

  it('never serves XML as XML', () => {
    for (const type of ['application/xml', 'text/xml']) {
      const headers = themeAssetHeaders(type, { dest: 'image' });

      assert.equal(headers['Content-Type'], 'text/plain; charset=utf-8', type);
      assert.equal(headers['Content-Disposition'], 'attachment; filename="asset"', type);
      assert.equal(headers['Cache-Control'], 'private, no-store', type);
    }
  });

  it('normalizes case and parameters before deciding', () => {
    const headers = themeAssetHeaders('IMAGE/SVG+XML; charset=utf-8', { dest: 'document' });
    assert.equal(headers['Content-Type'], 'text/plain; charset=utf-8');
    assert.match(headers['Content-Disposition'] ?? '', /^attachment;/);
  });

  it('strips quoting hazards and non-ASCII from the download name', () => {
    const headers = themeAssetHeaders('text/html', { filename: 'assets/ev"il\\\n\u00e9.html' });
    assert.equal(headers['Content-Disposition'], 'attachment; filename="ev_il___.html"');
  });

  it('forces PDFs to download instead of opening inline', () => {
    const headers = themeAssetHeaders('application/pdf', { dest: 'document', filename: 'guide.pdf' });

    assert.equal(headers['Content-Type'], 'application/pdf');
    assert.equal(headers['Content-Disposition'], 'attachment; filename="guide.pdf"');
    assert.equal(headers['Cache-Control'], 'private, no-store');
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  });

  it('falls back to octet-stream for an empty content type', () => {
    const headers = themeAssetHeaders('', { dest: 'document' });
    assert.equal(headers['Content-Type'], 'application/octet-stream');
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  });

  it('honors the caller cache policy for inert assets', () => {
    const headers = themeAssetHeaders('image/webp', { cacheControl: 'private, no-store' });
    assert.equal(headers['Cache-Control'], 'private, no-store');
  });
});
