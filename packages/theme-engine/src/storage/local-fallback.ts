import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { themePath, themeRoot, toPosixRelative } from './theme-path';
import type { ThemeRef } from './types';

export async function readLocalThemeFile(
  theme: ThemeRef,
  relativePath: string,
): Promise<string | null> {
  const abs = themePath(theme, relativePath);
  if (!existsSync(abs)) return null;
  return readFile(abs, 'utf8');
}

export async function listLocalThemeFiles(theme: ThemeRef): Promise<string[]> {
  const root = themeRoot(theme);
  if (!existsSync(root)) return [];

  const paths: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      const st = await stat(fullPath);
      if (!st.isFile()) continue;
      paths.push(toPosixRelative(root, fullPath));
    }
  }

  await walk(root);
  return paths.sort();
}
