export type ThemeStorageKind = 'local' | 'r2';

export interface ThemeRef {
  id: string;
  tenantId: string;
  slug: string;
  localRoot?: string;
  storagePrefix?: string;
}

export interface ThemeFileMeta {
  path: string;
  storageKey: string;
  /** @deprecated Legacy inline Mongo content */
  content?: string;
}

export interface ThemeFileInput {
  path: string;
  content: string;
  contentType?: string;
}

export interface WriteResult {
  path: string;
  storageKey: string;
  size: number;
  checksum: string;
  contentType: string;
}

export interface InstallResult {
  files: WriteResult[];
  storagePrefix?: string;
}

export interface ThemeStorage {
  readonly kind: ThemeStorageKind;

  loadTheme(theme: ThemeRef, files?: ThemeFileMeta[]): Promise<Record<string, string>>;
  readFile(theme: ThemeRef, path: string, meta?: ThemeFileMeta): Promise<string>;
  writeFile(theme: ThemeRef, path: string, content: string): Promise<WriteResult>;
  deleteFile(theme: ThemeRef, path: string, storageKey: string): Promise<void>;

  installTheme(theme: ThemeRef, files: ThemeFileInput[]): Promise<InstallResult>;
  duplicateTheme(source: ThemeRef, dest: ThemeRef): Promise<void>;
  deleteTheme(theme: ThemeRef): Promise<void>;

  exportTheme(theme: ThemeRef, files?: ThemeFileMeta[]): Promise<Buffer>;
  importTheme(theme: ThemeRef, zip: Buffer): Promise<InstallResult>;

  /** Local: fs.watch; R2: no-op. Returns unsubscribe. */
  watch(theme: ThemeRef, onChange: (paths: string[]) => void): () => void;
}
