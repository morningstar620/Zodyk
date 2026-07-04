import { DEFAULT_TENANT_ID } from '@zodyk/core';
import type { ITheme } from '@zodyk/database';
import {
  buildThemeObjectKey,
  buildThemeStoragePrefix,
  copyPrefix,
  deleteObject,
  deleteObjects,
  getObjectAsString,
  listObjects,
  putObject,
} from '@zodyk/media';
import type { Types } from 'mongoose';
import { checksum } from './install';

export const PROTECTED_THEME_PATHS = new Set(['layout/theme.liquid', 'config/settings_schema.json']);

export function guessContentType(path: string): string {
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.js')) return 'application/javascript';
  if (path.endsWith('.liquid')) return 'text/x-liquid';
  return 'text/plain';
}

export function themeStoragePrefix(tenantId: string, themeId: string): string {
  return buildThemeStoragePrefix(tenantId, themeId);
}

export function themeObjectKey(tenantId: string, themeId: string, path: string): string {
  return buildThemeObjectKey(tenantId, themeId, path);
}

export async function writeThemeObject(
  tenantId: string,
  themeId: string,
  path: string,
  content: string,
): Promise<{ r2Key: string; size: number; checksum: string; contentType: string }> {
  const r2Key = themeObjectKey(tenantId, themeId, path);
  const contentType = guessContentType(path);
  await putObject(r2Key, content, contentType);
  return {
    r2Key,
    size: Buffer.byteLength(content, 'utf8'),
    checksum: checksum(content),
    contentType,
  };
}

export async function readThemeObjectContent(
  r2Key: string,
  legacyContent?: string,
): Promise<string> {
  if (legacyContent !== undefined && legacyContent !== '') {
    return legacyContent;
  }
  return getObjectAsString(r2Key);
}

export async function deleteThemeObject(r2Key: string): Promise<void> {
  await deleteObject(r2Key);
}

export async function deleteThemePrefix(prefix: string): Promise<void> {
  const keys = await listObjects(prefix);
  await deleteObjects(keys);
}

export async function copyThemePrefix(
  sourcePrefix: string,
  destPrefix: string,
): Promise<void> {
  await copyPrefix(sourcePrefix, destPrefix);
}

export function ensureThemeStoragePrefix(
  theme: Pick<ITheme, 'storagePrefix' | '_id' | 'tenantId'>,
): string {
  return theme.storagePrefix ?? themeStoragePrefix(theme.tenantId ?? DEFAULT_TENANT_ID, theme._id.toString());
}

export function r2KeyToThemePath(prefix: string, r2Key: string): string {
  return r2Key.slice(prefix.length);
}

export async function listThemeObjectKeys(prefix: string): Promise<string[]> {
  return listObjects(prefix);
}

export type ThemeDocRef = {
  _id: Types.ObjectId;
  tenantId: string;
  storagePrefix?: string;
};
