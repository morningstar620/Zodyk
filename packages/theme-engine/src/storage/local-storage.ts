import { checksum } from '../install';
import { buildThemeZip, extractThemeZip } from '../zip';
import { guessContentType } from './content-type';
import {
  assertWithinThemeRoot,
  themePath,
  themeRoot,
  toPosixRelative,
} from './theme-path';
import type {
  InstallResult,
  ThemeFileInput,
  ThemeFileMeta,
  ThemeRef,
  ThemeStorage,
  WriteResult,
} from './types';
import { createHash } from 'node:crypto';
import { watch as fsWatch, mkdirSync, type FSWatcher } from 'node:fs';
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';

interface FileCacheEntry {
  mtimeMs: number;
  hash: string;
  content: string;
}

export class LocalFsStorage implements ThemeStorage {
  readonly kind = 'local' as const;

  private readonly fileCache = new Map<string, Map<string, FileCacheEntry>>();
  private readonly watchers = new Map<
    string,
    { watcher: FSWatcher; listeners: Set<(paths: string[]) => void> }
  >();

  private cacheKey(theme: ThemeRef): string {
    return theme.id;
  }

  private root(theme: ThemeRef): string {
    return themeRoot(theme);
  }

  async loadTheme(theme: ThemeRef, _files?: ThemeFileMeta[]): Promise<Record<string, string>> {
    const root = this.root(theme);
    await mkdir(root, { recursive: true });

    const cache = this.fileCache.get(this.cacheKey(theme)) ?? new Map<string, FileCacheEntry>();
    const next = new Map<string, FileCacheEntry>();
    const result: Record<string, string> = {};

    async function walk(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }
        const rel = toPosixRelative(root, fullPath);
        const st = await stat(fullPath);
        const prev = cache.get(rel);
        if (prev && prev.mtimeMs === st.mtimeMs) {
          next.set(rel, prev);
          result[rel] = prev.content;
          continue;
        }
        const content = await readFile(fullPath, 'utf8');
        const hash = createHash('sha1').update(content).digest('hex');
        if (prev && prev.hash === hash) {
          const entryCache = { ...prev, mtimeMs: st.mtimeMs };
          next.set(rel, entryCache);
          result[rel] = prev.content;
          continue;
        }
        next.set(rel, { mtimeMs: st.mtimeMs, hash, content });
        result[rel] = content;
      }
    }

    await walk(root);
    this.fileCache.set(this.cacheKey(theme), next);
    return result;
  }

  async readFile(theme: ThemeRef, path: string, _meta?: ThemeFileMeta): Promise<string> {
    const absolute = assertWithinThemeRoot(this.root(theme), themePath(theme, path));
    return readFile(absolute, 'utf8');
  }

  async writeFile(theme: ThemeRef, path: string, content: string): Promise<WriteResult> {
    const root = this.root(theme);
    await mkdir(root, { recursive: true });
    const absolute = assertWithinThemeRoot(root, themePath(theme, path));
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content, 'utf8');
    this.invalidateFileCache(theme, path);
    return {
      path,
      storageKey: path,
      size: Buffer.byteLength(content, 'utf8'),
      checksum: checksum(content),
      contentType: guessContentType(path),
    };
  }

  async deleteFile(theme: ThemeRef, path: string, _storageKey: string): Promise<void> {
    const absolute = assertWithinThemeRoot(this.root(theme), themePath(theme, path));
    await rm(absolute, { force: true });
    this.invalidateFileCache(theme, path);
  }

  async installTheme(theme: ThemeRef, files: ThemeFileInput[]): Promise<InstallResult> {
    const root = this.root(theme);
    await mkdir(root, { recursive: true });

    // Clear existing files under root (except we rewrite from payload)
    const existing = await this.loadTheme(theme);
    for (const path of Object.keys(existing)) {
      if (!files.some((f) => f.path === path)) {
        await this.deleteFile(theme, path, path);
      }
    }

    const results: WriteResult[] = [];
    for (const file of files) {
      results.push(await this.writeFile(theme, file.path, file.content));
    }
    return { files: results };
  }

  async duplicateTheme(source: ThemeRef, dest: ThemeRef): Promise<void> {
    const srcRoot = this.root(source);
    const destRoot = this.root(dest);
    await mkdir(dirname(destRoot), { recursive: true });
    await cp(srcRoot, destRoot, { recursive: true, force: true });
    this.fileCache.delete(this.cacheKey(dest));
  }

  async deleteTheme(theme: ThemeRef): Promise<void> {
    const root = this.root(theme);
    await rm(root, { recursive: true, force: true });
    this.fileCache.delete(this.cacheKey(theme));
    this.stopWatch(theme.id);
  }

  async exportTheme(theme: ThemeRef, _files?: ThemeFileMeta[]): Promise<Buffer> {
    const map = await this.loadTheme(theme);
    return buildThemeZip(Object.entries(map).map(([path, content]) => ({ path, content })));
  }

  async importTheme(theme: ThemeRef, zip: Buffer): Promise<InstallResult> {
    const files = await extractThemeZip(zip);
    return this.installTheme(
      theme,
      files.map((f) => ({ path: f.path, content: f.content, contentType: f.contentType })),
    );
  }

  watch(theme: ThemeRef, onChange: (paths: string[]) => void): () => void {
    const root = this.root(theme);
    mkdirSync(root, { recursive: true });
    const key = theme.id;
    let entry = this.watchers.get(key);
    if (!entry) {
      const listeners = new Set<(paths: string[]) => void>();
      const watcher = fsWatch(root, { recursive: true }, (_event, filename) => {
        if (!filename) {
          this.fileCache.delete(key);
          for (const listener of listeners) listener([]);
          return;
        }
        const rel = filename.replace(/\\/g, '/');
        this.invalidateFileCache(theme, rel);
        for (const listener of listeners) listener([rel]);
      });
      entry = { watcher, listeners };
      this.watchers.set(key, entry);
    }
    entry.listeners.add(onChange);

    return () => {
      const current = this.watchers.get(key);
      if (!current) return;
      current.listeners.delete(onChange);
      if (current.listeners.size === 0) {
        current.watcher.close();
        this.watchers.delete(key);
      }
    };
  }

  private invalidateFileCache(theme: ThemeRef, path: string): void {
    const cache = this.fileCache.get(this.cacheKey(theme));
    cache?.delete(path);
  }

  private stopWatch(themeId: string): void {
    const entry = this.watchers.get(themeId);
    if (!entry) return;
    entry.watcher.close();
    this.watchers.delete(themeId);
  }
}
