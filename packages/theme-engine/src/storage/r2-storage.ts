import {
  buildThemeObjectKey,
  buildThemeStoragePrefix,
  copyPrefix,
  deleteObject,
  deleteObjects,
  getObjectAsString,
  listObjects,
  putObject,
} from '@zodyk/media/objects';
import { requireStorageConfig } from '@zodyk/media/config';
import { checksum } from '../install';
import { buildThemeZip, extractThemeZip } from '../zip';
import { guessContentType } from './content-type';
import type {
  InstallResult,
  ThemeFileInput,
  ThemeFileMeta,
  ThemeRef,
  ThemeStorage,
  WriteResult,
} from './types';

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]!, index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

function prefixFor(theme: ThemeRef): string {
  return theme.storagePrefix ?? buildThemeStoragePrefix(theme.tenantId, theme.id);
}

export class R2Storage implements ThemeStorage {
  readonly kind = 'r2' as const;

  async ensureConfigured(): Promise<void> {
    await requireStorageConfig();
  }

  async loadTheme(theme: ThemeRef, files: ThemeFileMeta[] = []): Promise<Record<string, string>> {
    await this.ensureConfigured();
    const entries = await mapConcurrent(files, 10, async (f) => {
      const content = await this.readContent(f.storageKey, f.content);
      return [f.path, content] as const;
    });
    return Object.fromEntries(entries);
  }

  async readFile(theme: ThemeRef, path: string, meta?: ThemeFileMeta): Promise<string> {
    await this.ensureConfigured();
    if (meta?.content) return meta.content;
    const key = meta?.storageKey ?? buildThemeObjectKey(theme.tenantId, theme.id, path);
    return getObjectAsString(key);
  }

  async writeFile(theme: ThemeRef, path: string, content: string): Promise<WriteResult> {
    await this.ensureConfigured();
    const storageKey = buildThemeObjectKey(theme.tenantId, theme.id, path);
    const contentType = guessContentType(path);
    await putObject(storageKey, content, contentType);
    return {
      path,
      storageKey,
      size: Buffer.byteLength(content, 'utf8'),
      checksum: checksum(content),
      contentType,
    };
  }

  async deleteFile(_theme: ThemeRef, _path: string, storageKey: string): Promise<void> {
    await this.ensureConfigured();
    await deleteObject(storageKey);
  }

  async installTheme(theme: ThemeRef, files: ThemeFileInput[]): Promise<InstallResult> {
    await this.ensureConfigured();
    const storagePrefix = prefixFor(theme);
    const existing = await listObjects(storagePrefix);
    if (existing.length > 0) {
      await deleteObjects(existing);
    }

    const results: WriteResult[] = [];
    for (const file of files) {
      results.push(await this.writeFile(theme, file.path, file.content));
    }
    return { files: results, storagePrefix };
  }

  async duplicateTheme(source: ThemeRef, dest: ThemeRef): Promise<void> {
    await this.ensureConfigured();
    const sourcePrefix = prefixFor(source);
    const destPrefix = prefixFor(dest);
    await copyPrefix(sourcePrefix, destPrefix);
  }

  async deleteTheme(theme: ThemeRef): Promise<void> {
    await this.ensureConfigured();
    const keys = await listObjects(prefixFor(theme));
    await deleteObjects(keys);
  }

  async exportTheme(theme: ThemeRef, files: ThemeFileMeta[] = []): Promise<Buffer> {
    const map = await this.loadTheme(theme, files);
    return buildThemeZip(Object.entries(map).map(([path, content]) => ({ path, content })));
  }

  async importTheme(theme: ThemeRef, zip: Buffer): Promise<InstallResult> {
    const files = await extractThemeZip(zip);
    return this.installTheme(
      theme,
      files.map((f) => ({ path: f.path, content: f.content, contentType: f.contentType })),
    );
  }

  watch(_theme: ThemeRef, _onChange: (paths: string[]) => void): () => void {
    return () => undefined;
  }

  private async readContent(storageKey: string, legacyContent?: string): Promise<string> {
    if (legacyContent !== undefined && legacyContent !== '') {
      return legacyContent;
    }
    return getObjectAsString(storageKey);
  }
}
