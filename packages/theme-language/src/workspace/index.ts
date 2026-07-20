import type { CrossFileReference, ThemeWorkspaceSnapshot } from '../types';
import { ThemeCatalog } from '../catalog/objects';
import { ThemeWorkspaceIndex } from './cross-file-index';
import { resolveLanguageId } from './file-context';
import { invalidateParseCacheForPath } from '../cache/parse-cache';

export class ThemeWorkspace {
  catalog: ThemeCatalog;
  index: ThemeWorkspaceIndex;

  constructor(public snapshot: ThemeWorkspaceSnapshot) {
    this.catalog = new ThemeCatalog(snapshot);
    this.index = new ThemeWorkspaceIndex(snapshot, {
      refs: snapshot.crossFileRefs,
    });
  }

  get themeId(): string {
    return this.snapshot.themeId;
  }

  updateSnapshot(snapshot: ThemeWorkspaceSnapshot): void {
    this.snapshot = snapshot;
    this.catalog.updateWorkspace(snapshot);
    this.index.updateWorkspace(snapshot);
  }

  updateFile(path: string, content: string, version?: number): void {
    const existing = this.snapshot.files[path];
    this.snapshot.files[path] = {
      path,
      content,
      version: version ?? (existing?.version ?? 0) + 1,
      languageId: resolveLanguageId(path),
    };
    invalidateParseCacheForPath(path);
    this.index.updateFile(path, content);
  }

  getFile(path: string): string | undefined {
    return this.snapshot.files[path]?.content;
  }

  getFilePaths(): string[] {
    return Object.keys(this.snapshot.files).sort();
  }
}

export function createThemeWorkspace(snapshot: ThemeWorkspaceSnapshot): ThemeWorkspace {
  return new ThemeWorkspace(snapshot);
}
