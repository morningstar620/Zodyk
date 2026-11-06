import JSZip from 'jszip';
import { guessContentType, isTextThemeFile } from './storage/content-type';

const MEGABYTE = 1024 * 1024;

export interface ThemeZipLimits {
  /** Compressed archive size limit. */
  maxZipBytes: number;
  /** Total uncompressed size limit across every extracted entry. */
  maxUncompressedBytes: number;
  /** Uncompressed size limit for a single entry. */
  maxFileBytes: number;
  /** Reject archives that expand by more than this factor. */
  maxCompressionRatio: number;
}

export const DEFAULT_THEME_ZIP_LIMITS: ThemeZipLimits = {
  maxZipBytes: 50 * MEGABYTE,
  maxUncompressedBytes: 100 * MEGABYTE,
  maxFileBytes: 25 * MEGABYTE,
  maxCompressionRatio: 1000,
};

/** Only apply the ratio check once the archive claims a meaningful size. */
const MIN_RATIO_CHECK_BYTES = MEGABYTE;

const REQUIRED_PATHS = ['layout/theme.liquid', 'config/settings_schema.json'];

export interface ThemeZipFile {
  path: string;
  /** UTF-8 text for known text extensions, raw bytes for everything else. */
  content: string | Buffer;
  contentType: string;
}

interface ZipEntryData {
  uncompressedSize?: number;
}

function declaredUncompressedSize(entry: JSZip.JSZipObject): number | null {
  const data = (entry as unknown as { _data?: ZipEntryData })._data;
  return typeof data?.uncompressedSize === 'number' ? data.uncompressedSize : null;
}

export function validateThemePath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return false;
  if (normalized.startsWith('__MACOSX/') || normalized.includes('/.')) return false;
  return true;
}

export async function extractThemeZip(
  buffer: Buffer,
  limits: ThemeZipLimits = DEFAULT_THEME_ZIP_LIMITS,
): Promise<ThemeZipFile[]> {
  if (buffer.length > limits.maxZipBytes) {
    throw new Error(`Theme zip exceeds ${formatMegabytes(limits.maxZipBytes)} limit`);
  }

  const zip = await JSZip.loadAsync(buffer);
  const files: ThemeZipFile[] = [];
  let rootPrefix = '';

  const entries = Object.keys(zip.files).filter((name) => !zip.files[name]!.dir);
  if (entries.length === 0) {
    throw new Error('Theme zip is empty');
  }

  const firstPath = entries[0]!.replace(/\\/g, '/');
  if (firstPath.includes('/')) {
    rootPrefix = firstPath.split('/')[0]! + '/';
    const allShareRoot = entries.every((e) => e.replace(/\\/g, '/').startsWith(rootPrefix));
    if (!allShareRoot) rootPrefix = '';
  }

  let declaredTotal = 0;
  for (const rawName of entries) {
    const declared = declaredUncompressedSize(zip.files[rawName]!);
    if (declared === null) continue;
    if (declared > limits.maxFileBytes) {
      throw new Error(
        `Theme file exceeds ${formatMegabytes(limits.maxFileBytes)} limit: ${rawName}`,
      );
    }
    declaredTotal += declared;
    if (declaredTotal > limits.maxUncompressedBytes) {
      throw new Error(
        `Theme zip expands beyond ${formatMegabytes(limits.maxUncompressedBytes)} limit`,
      );
    }
  }

  if (
    declaredTotal >= MIN_RATIO_CHECK_BYTES &&
    buffer.length > 0 &&
    declaredTotal / buffer.length > limits.maxCompressionRatio
  ) {
    throw new Error(
      `Theme zip compression ratio exceeds ${limits.maxCompressionRatio}:1 limit`,
    );
  }

  let extractedBytes = 0;
  for (const rawName of entries) {
    const name = rawName.replace(/\\/g, '/');
    let path = rootPrefix && name.startsWith(rootPrefix) ? name.slice(rootPrefix.length) : name;
    path = path.replace(/^\/+/, '');

    if (!validateThemePath(path)) continue;

    const entry = zip.files[rawName]!;
    const bytes = await entry.async('uint8array');
    extractedBytes += bytes.byteLength;
    if (bytes.byteLength > limits.maxFileBytes) {
      throw new Error(
        `Theme file exceeds ${formatMegabytes(limits.maxFileBytes)} limit: ${path}`,
      );
    }
    if (extractedBytes > limits.maxUncompressedBytes) {
      throw new Error(
        `Theme zip expands beyond ${formatMegabytes(limits.maxUncompressedBytes)} limit`,
      );
    }

    const raw = Buffer.from(bytes);
    files.push({
      path,
      content: isTextThemeFile(path) ? raw.toString('utf8') : raw,
      contentType: guessContentType(path),
    });
  }

  if (files.length === 0) {
    throw new Error('No valid theme files found in zip');
  }

  const paths = new Set(files.map((f) => f.path));
  for (const required of REQUIRED_PATHS) {
    if (!paths.has(required)) {
      throw new Error(`Theme zip missing required file: ${required}`);
    }
  }

  return files;
}

export async function buildThemeZip(
  files: Array<{ path: string; content: string | Buffer }>,
): Promise<Buffer> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function formatMegabytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < MEGABYTE) return `${Math.round(bytes / 1024)}KB`;
  const megabytes = bytes / MEGABYTE;
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)}MB`;
}

export function buildThemeZipFilename(themeName: string): string {
  const safe = themeName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return `${safe || 'theme'}.zip`;
}
