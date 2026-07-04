import JSZip from 'jszip';

const MAX_ZIP_BYTES = 50 * 1024 * 1024;

const REQUIRED_PATHS = ['layout/theme.liquid', 'config/settings_schema.json'];

export interface ThemeZipFile {
  path: string;
  content: string;
  contentType: string;
}

export function validateThemePath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return false;
  if (normalized.startsWith('__MACOSX/') || normalized.includes('/.')) return false;
  return true;
}

export async function extractThemeZip(buffer: Buffer): Promise<ThemeZipFile[]> {
  if (buffer.length > MAX_ZIP_BYTES) {
    throw new Error('Theme zip exceeds 50MB limit');
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

  for (const rawName of entries) {
    const name = rawName.replace(/\\/g, '/');
    let path = rootPrefix && name.startsWith(rootPrefix) ? name.slice(rootPrefix.length) : name;
    path = path.replace(/^\/+/, '');

    if (!validateThemePath(path)) continue;

    const entry = zip.files[rawName]!;
    const content = await entry.async('string');
    files.push({
      path,
      content,
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
  files: Array<{ path: string; content: string }>,
): Promise<Buffer> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function guessContentType(path: string): string {
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.js')) return 'application/javascript';
  if (path.endsWith('.liquid')) return 'text/x-liquid';
  return 'text/plain';
}

export function buildThemeZipFilename(themeName: string): string {
  const safe = themeName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return `${safe || 'theme'}.zip`;
}
