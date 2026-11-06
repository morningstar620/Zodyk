import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { guessContentType, isTextThemeFile } from './storage/content-type';

export function checksum(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function readThemeDirectory(
  rootDir: string,
): Promise<Array<{ path: string; content: string | Buffer; contentType: string }>> {
  const files: Array<{ path: string; content: string | Buffer; contentType: string }> = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      const relPath = relative(rootDir, fullPath).replace(/\\/g, '/');
      const raw = await readFile(fullPath);
      files.push({
        path: relPath,
        content: isTextThemeFile(relPath) ? raw.toString('utf8') : raw,
        contentType: guessContentType(relPath),
      });
    }
  }

  const rootStat = await stat(rootDir);
  if (!rootStat.isDirectory()) {
    throw new Error(`Theme directory not found: ${rootDir}`);
  }

  await walk(rootDir);
  return files;
}

export function filesToMap(
  files: Array<{ path: string; content: string | Buffer }>,
): Record<string, string> {
  return Object.fromEntries(
    files
      .filter((file): file is { path: string; content: string } => typeof file.content === 'string')
      .map((file) => [file.path, file.content]),
  );
}
