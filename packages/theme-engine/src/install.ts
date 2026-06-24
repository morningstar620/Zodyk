import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

export function checksum(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function readThemeDirectory(
  rootDir: string,
): Promise<Array<{ path: string; content: string; contentType: string }>> {
  const files: Array<{ path: string; content: string; contentType: string }> = [];

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
      const content = await readFile(fullPath, 'utf8');
      files.push({
        path: relPath,
        content,
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

function guessContentType(path: string): string {
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.js')) return 'application/javascript';
  if (path.endsWith('.liquid')) return 'text/x-liquid';
  return 'text/plain';
}

export function filesToMap(
  files: Array<{ path: string; content: string }>,
): Record<string, string> {
  return Object.fromEntries(files.map((f) => [f.path, f.content]));
}
