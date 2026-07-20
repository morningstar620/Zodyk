import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createThemeStorage,
  resetThemeStorageForTests,
  resolveThemeStorageKind,
} from './create-theme-storage';
import { LocalFsStorage } from './local-storage';
import { assertWithinThemeRoot, themePath, themeRoot } from './theme-path';
import type { ThemeRef } from './types';

describe('resolveThemeStorageKind', () => {
  const prevStorage = process.env.THEME_STORAGE;
  const prevNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (prevStorage === undefined) delete process.env.THEME_STORAGE;
    else process.env.THEME_STORAGE = prevStorage;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    resetThemeStorageForTests();
  });

  it('respects explicit THEME_STORAGE', () => {
    process.env.THEME_STORAGE = 'r2';
    expect(resolveThemeStorageKind()).toBe('r2');
    process.env.THEME_STORAGE = 'local';
    expect(resolveThemeStorageKind()).toBe('local');
  });

  it('defaults to local outside production', () => {
    delete process.env.THEME_STORAGE;
    process.env.NODE_ENV = 'development';
    expect(resolveThemeStorageKind()).toBe('local');
  });

  it('defaults to r2 in production', () => {
    delete process.env.THEME_STORAGE;
    process.env.NODE_ENV = 'production';
    expect(resolveThemeStorageKind()).toBe('r2');
  });
});

describe('themePath', () => {
  it('joins root, slug, and relative path', () => {
    const base = '/repo/themes';
    expect(themeRoot({ slug: 'zodyk-starter' }, base)).toBe(join(base, 'zodyk-starter'));
    expect(themePath({ slug: 'zodyk-starter' }, 'templates/index.json', base)).toBe(
      join(base, 'zodyk-starter', 'templates', 'index.json'),
    );
  });

  it('honors localRoot override', () => {
    const base = '/repo/themes';
    expect(themeRoot({ slug: 'x', localRoot: 'shop' }, base)).toBe(join(base, 'shop'));
  });

  it('rejects path traversal', () => {
    expect(() => assertWithinThemeRoot('/themes/a', '/themes/b/x')).toThrow(/escapes/);
  });
});

describe('LocalFsStorage', () => {
  let root: string;
  let prevLocalRoot: string | undefined;
  let storage: LocalFsStorage;
  const theme: ThemeRef = {
    id: 'theme1',
    tenantId: 'default',
    slug: 'demo',
  };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'zodyk-theme-'));
    prevLocalRoot = process.env.THEME_LOCAL_ROOT;
    process.env.THEME_LOCAL_ROOT = root;
    process.env.THEME_STORAGE = 'local';
    resetThemeStorageForTests();
    storage = new LocalFsStorage();
  });

  afterEach(async () => {
    if (prevLocalRoot === undefined) delete process.env.THEME_LOCAL_ROOT;
    else process.env.THEME_LOCAL_ROOT = prevLocalRoot;
    resetThemeStorageForTests();
    await rm(root, { recursive: true, force: true });
  });

  it('writes and reads files with relative storageKey', async () => {
    const result = await storage.writeFile(theme, 'templates/index.json', '{"name":"Home"}');
    expect(result.storageKey).toBe('templates/index.json');
    const content = await storage.readFile(theme, 'templates/index.json');
    expect(content).toBe('{"name":"Home"}');
    const onDisk = await readFile(join(root, 'demo', 'templates', 'index.json'), 'utf8');
    expect(onDisk).toBe('{"name":"Home"}');
  });

  it('loadTheme returns map and reuses mtime cache', async () => {
    await storage.writeFile(theme, 'layout/theme.liquid', '<html>{{ content_for_layout }}</html>');
    const first = await storage.loadTheme(theme);
    expect(first['layout/theme.liquid']).toContain('content_for_layout');
    const second = await storage.loadTheme(theme);
    expect(second['layout/theme.liquid']).toBe(first['layout/theme.liquid']);
  });

  it('installTheme sets storageKeys to relative paths', async () => {
    const installed = await storage.installTheme(theme, [
      { path: 'config/settings.json', content: '{}' },
      { path: 'layout/theme.liquid', content: 'x' },
    ]);
    expect(installed.files.every((f) => f.storageKey === f.path)).toBe(true);
  });

  it('duplicateTheme copies directory', async () => {
    await storage.writeFile(theme, 'snippets/a.liquid', 'a');
    const dest: ThemeRef = { ...theme, id: 'theme2', slug: 'demo-copy' };
    await storage.duplicateTheme(theme, dest);
    const content = await storage.readFile(dest, 'snippets/a.liquid');
    expect(content).toBe('a');
  });

  it('createThemeStorage returns local', () => {
    const s = createThemeStorage('local');
    expect(s.kind).toBe('local');
  });
});
