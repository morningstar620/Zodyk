import { DEFAULT_TENANT_ID } from '@zodyk/core';
import type { ITheme } from '@zodyk/database';
import {
  buildThemeObjectKey,
  buildThemeStoragePrefix,
} from '@zodyk/media';

/** @deprecated Import from `./storage` — kept for existing imports. */
export {
  PROTECTED_THEME_PATHS,
  guessContentType,
} from './storage/content-type';

export function themeStoragePrefix(tenantId: string, themeId: string): string {
  return buildThemeStoragePrefix(tenantId, themeId);
}

export function themeObjectKey(tenantId: string, themeId: string, path: string): string {
  return buildThemeObjectKey(tenantId, themeId, path);
}

export function ensureThemeStoragePrefix(
  theme: Pick<ITheme, 'storagePrefix' | '_id' | 'tenantId'>,
): string {
  return (
    theme.storagePrefix ??
    themeStoragePrefix(theme.tenantId ?? DEFAULT_TENANT_ID, theme._id.toString())
  );
}
