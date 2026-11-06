import { EventEmitter } from 'node:events';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_ZIP_LIMITS,
  buildThemeZip,
  extractThemeZip,
  readEntryBytes,
  validateThemePath,
} from './zip';

function fakeEntry(chunks: Buffer[]): JSZip.JSZipObject {
  return {
    nodeStream: () => {
      const stream = new EventEmitter() as EventEmitter & {
        pause: () => void;
        destroy: () => void;
      };
      stream.pause = () => undefined;
      stream.destroy = () => undefined;
      queueMicrotask(() => {
        for (const chunk of chunks) stream.emit('data', chunk);
        stream.emit('end');
      });
      return stream;
    },
  } as unknown as JSZip.JSZipObject;
}

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xfe, 0x01,
]);

async function buildZip(
  entries: Array<{ path: string; content: string | Buffer }>,
): Promise<Buffer> {
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.path, entry.content);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function baseEntries(): Array<{ path: string; content: string | Buffer }> {
  return [
    { path: 'layout/theme.liquid', content: '<html>{{ content_for_layout }}</html>' },
    { path: 'config/settings_schema.json', content: '[]' },
  ];
}

describe('validateThemePath', () => {
  it('rejects traversal, absolute, and hidden segments', () => {
    expect(validateThemePath('assets/logo.png')).toBe(true);
    expect(validateThemePath('../secret')).toBe(false);
    expect(validateThemePath('snippets/../../secret.liquid')).toBe(false);
    expect(validateThemePath('/etc/passwd')).toBe(true);
    expect(validateThemePath('__MACOSX/._x')).toBe(false);
    expect(validateThemePath('snippets/.hidden.liquid')).toBe(false);
  });
});

describe('readEntryBytes', () => {
  it('aborts the stream when actual decompressed bytes exceed the per-file limit', async () => {
    const entry = fakeEntry([Buffer.alloc(64), Buffer.alloc(64)]);

    await expect(
      readEntryBytes(entry, 'assets/big.bin', { ...DEFAULT_THEME_ZIP_LIMITS, maxFileBytes: 100 }, 0),
    ).rejects.toThrow(/exceeds/i);
  });

  it('aborts when the running total exceeds the unpacked limit', async () => {
    const entry = fakeEntry([Buffer.alloc(64)]);

    await expect(
      readEntryBytes(
        entry,
        'assets/big.bin',
        { ...DEFAULT_THEME_ZIP_LIMITS, maxUncompressedBytes: 100 },
        80,
      ),
    ).rejects.toThrow(/expands beyond/i);
  });
});

describe('extractThemeZip', () => {
  it('keeps binary assets as bytes and decodes text files', async () => {
    const zip = await buildZip([...baseEntries(), { path: 'assets/logo.png', content: PNG_BYTES }]);

    const files = await extractThemeZip(zip);
    const logo = files.find((file) => file.path === 'assets/logo.png');
    const layout = files.find((file) => file.path === 'layout/theme.liquid');

    expect(logo?.contentType).toBe('image/png');
    expect(Buffer.isBuffer(logo?.content)).toBe(true);
    expect((logo?.content as Buffer).equals(PNG_BYTES)).toBe(true);
    expect(typeof layout?.content).toBe('string');
    expect(layout?.content).toContain('content_for_layout');
  });

  it('round-trips binary assets through buildThemeZip', async () => {
    const zip = await buildThemeZip([
      ...baseEntries(),
      { path: 'assets/font.woff2', content: PNG_BYTES },
    ]);

    const files = await extractThemeZip(zip);
    const font = files.find((file) => file.path === 'assets/font.woff2');

    expect(font?.contentType).toBe('font/woff2');
    expect((font?.content as Buffer).equals(PNG_BYTES)).toBe(true);
  });

  it('skips traversal entries and still requires the base files', async () => {
    const zip = await buildZip([
      ...baseEntries(),
      { path: 'snippets/../../evil.liquid', content: 'x' },
    ]);

    const files = await extractThemeZip(zip);
    expect(files.map((file) => file.path)).not.toContain('snippets/../../evil.liquid');
    expect(files.every((file) => !file.path.includes('..'))).toBe(true);
  });

  it('rejects archives missing required files', async () => {
    const zip = await buildZip([{ path: 'layout/theme.liquid', content: 'x' }]);
    await expect(extractThemeZip(zip)).rejects.toThrow(/missing required file/i);
  });

  it('rejects a zip larger than the compressed limit', async () => {
    const zip = await buildZip(baseEntries());
    await expect(
      extractThemeZip(zip, { ...DEFAULT_THEME_ZIP_LIMITS, maxZipBytes: 1 }),
    ).rejects.toThrow(/exceeds/i);
  });

  it('rejects a single entry over the per-file limit before extraction', async () => {
    const zip = await buildZip([
      ...baseEntries(),
      { path: 'assets/big.bin', content: Buffer.alloc(1024) },
    ]);
    await expect(
      extractThemeZip(zip, {
        ...DEFAULT_THEME_ZIP_LIMITS,
        maxFileBytes: 16,
      }),
    ).rejects.toThrow(/exceeds/i);
  });

  it('rejects an archive with an extreme compression ratio', async () => {
    const zip = await buildZip([
      ...baseEntries(),
      { path: 'assets/padding.bin', content: Buffer.alloc(2 * 1024 * 1024) },
    ]);
    await expect(
      extractThemeZip(zip, {
        ...DEFAULT_THEME_ZIP_LIMITS,
        maxCompressionRatio: 10,
      }),
    ).rejects.toThrow(/compression ratio/i);
  });

  it('rejects an archive whose unpacked size exceeds the total limit', async () => {
    // Highly compressible: the compressed zip is tiny, the declared unpacked
    // size is not.
    const zip = await buildZip([
      ...baseEntries(),
      { path: 'assets/padding.bin', content: Buffer.alloc(64 * 1024) },
    ]);
    await expect(
      extractThemeZip(zip, {
        ...DEFAULT_THEME_ZIP_LIMITS,
        maxUncompressedBytes: 1024,
      }),
    ).rejects.toThrow(/expands beyond/i);
  });
});
