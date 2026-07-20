import { LocalFsStorage } from './local-storage';
import { R2Storage } from './r2-storage';
import type { ThemeStorage, ThemeStorageKind } from './types';

let cached: ThemeStorage | undefined;
let logged = false;

export function resolveThemeStorageKind(): ThemeStorageKind {
  const explicit = process.env.THEME_STORAGE?.trim().toLowerCase();
  if (explicit === 'local' || explicit === 'r2') return explicit;
  return process.env.NODE_ENV === 'production' ? 'r2' : 'local';
}

export function createThemeStorage(kind = resolveThemeStorageKind()): ThemeStorage {
  if (kind === 'local') {
    return new LocalFsStorage();
  }
  return new R2Storage();
}

export function getThemeStorage(): ThemeStorage {
  if (!cached) {
    cached = createThemeStorage();
    if (!logged) {
      logged = true;
      const label =
        cached.kind === 'local'
          ? `theme storage: local → ${process.env.THEME_LOCAL_ROOT || 'themes/'}`
          : 'theme storage: r2';
      console.info(`[theme-engine] ${label}`);
    }
  }
  return cached;
}

/** Test helper — reset singleton between tests. */
export function resetThemeStorageForTests(): void {
  cached = undefined;
  logged = false;
}

export function getThemeStorageKind(): ThemeStorageKind {
  return getThemeStorage().kind;
}
