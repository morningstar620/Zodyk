import { describe, expect, it } from 'vitest';
import {
  MAX_INPUT_PIXELS,
  MediaValidationError,
  SHARP_INPUT_OPTIONS,
  assertImageWithinPixelLimit,
  detectUploadMimeType,
  validateMediaUpload,
} from '@zodyk/media';

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(8),
]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const gif = Buffer.from('GIF89a', 'ascii');
const webp = Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.alloc(4), Buffer.from('WEBP', 'ascii')]);
const avif = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x1c]),
  Buffer.from('ftypavif', 'ascii'),
]);
const pdf = Buffer.from('%PDF-1.7\n', 'ascii');
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const html = Buffer.from('<html><script>alert(1)</script></html>');

describe('detectUploadMimeType', () => {
  it.each([
    ['image/jpeg', jpeg],
    ['image/png', png],
    ['image/gif', gif],
    ['image/webp', webp],
    ['image/avif', avif],
    ['application/pdf', pdf],
  ])('detects %s from magic bytes', (mimeType, buffer) => {
    expect(detectUploadMimeType(buffer)).toBe(mimeType);
  });

  it('does not detect SVG or HTML as an allowed type', () => {
    expect(detectUploadMimeType(svg)).toBeNull();
    expect(detectUploadMimeType(html)).toBeNull();
  });
});

describe('validateMediaUpload', () => {
  it('accepts a PNG and uses the detected type', () => {
    expect(
      validateMediaUpload({ buffer: png, filename: 'logo.png', declaredMimeType: 'image/png' }),
    ).toEqual({ mimeType: 'image/png' });
  });

  it('normalizes a generic browser type to the detected type', () => {
    expect(
      validateMediaUpload({
        buffer: png,
        filename: 'logo.png',
        declaredMimeType: 'application/octet-stream',
      }),
    ).toEqual({ mimeType: 'image/png' });
  });

  it('rejects an SVG even when it is honestly declared', () => {
    expect(() =>
      validateMediaUpload({ buffer: svg, filename: 'logo.svg', declaredMimeType: 'image/svg+xml' }),
    ).toThrow(MediaValidationError);
  });

  it('rejects an HTML file even when it is honestly declared', () => {
    expect(() =>
      validateMediaUpload({ buffer: html, filename: 'page.html', declaredMimeType: 'text/html' }),
    ).toThrow(MediaValidationError);
  });

  it('rejects SVG content disguised with an image/png type', () => {
    expect(() =>
      validateMediaUpload({ buffer: svg, filename: 'logo.png', declaredMimeType: 'image/png' }),
    ).toThrow(MediaValidationError);
  });

  it('rejects a dangerous extension even when the bytes are a PNG', () => {
    expect(() =>
      validateMediaUpload({ buffer: png, filename: 'logo.svg', declaredMimeType: 'image/png' }),
    ).toThrow(MediaValidationError);
  });

  it('rejects a declared type that conflicts with the bytes', () => {
    expect(() =>
      validateMediaUpload({ buffer: jpeg, filename: 'photo.jpg', declaredMimeType: 'image/png' }),
    ).toThrow(MediaValidationError);
  });

  it('rejects unknown bytes', () => {
    expect(() =>
      validateMediaUpload({
        buffer: Buffer.from('not an image'),
        filename: 'file.bin',
        declaredMimeType: 'application/octet-stream',
      }),
    ).toThrow(MediaValidationError);
  });

  it('rejects an empty file', () => {
    expect(() =>
      validateMediaUpload({ buffer: Buffer.alloc(0), filename: 'empty.png', declaredMimeType: 'image/png' }),
    ).toThrow(MediaValidationError);
  });
});

describe('image pixel limit', () => {
  it('configures sharp to reject oversized decodes', () => {
    expect(SHARP_INPUT_OPTIONS).toEqual({
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: 'error',
    });
  });

  it('accepts dimensions at the limit', () => {
    expect(() => assertImageWithinPixelLimit(10_000, 10_000)).not.toThrow();
  });

  it('rejects dimensions above the limit', () => {
    expect(() => assertImageWithinPixelLimit(10_001, 10_000)).toThrow(MediaValidationError);
  });

  it('rejects an image whose dimensions cannot be read', () => {
    expect(() => assertImageWithinPixelLimit(undefined, 100)).toThrow(MediaValidationError);
  });
});
