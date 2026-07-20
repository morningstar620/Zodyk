import type { SectionDefinition, ThemeSettingsGroup } from '@zodyk/core';

export type ThemeFileKind =
  | 'layout'
  | 'section'
  | 'snippet'
  | 'template'
  | 'config'
  | 'asset'
  | 'locale'
  | 'other';

export interface ThemeFile {
  path: string;
  content: string;
  version: number;
  languageId: string;
}

export interface ThemeFileMeta {
  path: string;
  version: number;
  languageId: string;
}

export interface ThemeWorkspaceMetadata {
  themeId: string;
  name: string;
  status: 'live' | 'draft' | 'archived';
  files: Record<string, ThemeFileMeta>;
  sectionSchemas: Record<string, SectionDefinition | null>;
  settingsSchema: ThemeSettingsGroup[];
  settings: Record<string, unknown>;
  snippets: string[];
  sectionTypes: string[];
  templates: string[];
  metaObjects: MetaObjectCatalogEntry[];
  systemEntities: SystemEntityCatalogEntry[];
  pages: PageCatalogEntry[];
  menus: MenuCatalogEntry[];
  routes: RouteCatalogEntry[];
  locales: Record<string, string>;
  crossFileRefs?: CrossFileReference[];
  healthIssues: Array<{
    code: string;
    message: string;
    severity: 'error' | 'warning';
    templateKey?: string;
    sectionType?: string;
  }>;
}

export interface MetaObjectCatalogEntry {
  slug: string;
  name: string;
  singularName?: string;
  templateKey: string;
  archivePath?: string;
  singlePath?: string;
  archiveEnabled: boolean;
  fields: FieldCatalogEntry[];
}

export interface SystemEntityCatalogEntry {
  slug: string;
  name: string;
  singularLabel?: string;
  fields: FieldCatalogEntry[];
  relationships: Array<{ name: string; targetSlug: string; type: string }>;
}

export interface FieldCatalogEntry {
  key: string;
  label: string;
  type: string;
  localized?: boolean;
}

export interface PageCatalogEntry {
  id: string;
  label: string;
  templatePath: string;
  pathname: string;
  group: string;
}

export interface MenuCatalogEntry {
  handle: string;
  title: string;
}

export interface RouteCatalogEntry {
  pathname: string;
  templatePath: string;
  viewType: string;
  metaObjectSlug?: string;
}

export interface ThemeWorkspaceSnapshot {
  themeId: string;
  name?: string;
  status?: 'live' | 'draft' | 'archived';
  files: Record<string, ThemeFile>;
  sectionSchemas: Record<string, SectionDefinition | null>;
  settingsSchema: ThemeSettingsGroup[];
  settings: Record<string, unknown>;
  snippets: string[];
  sectionTypes: string[];
  templates: string[];
  metaObjects: MetaObjectCatalogEntry[];
  systemEntities: SystemEntityCatalogEntry[];
  pages: PageCatalogEntry[];
  menus: MenuCatalogEntry[];
  routes: RouteCatalogEntry[];
  locales: Record<string, string>;
  crossFileRefs?: CrossFileReference[];
  healthIssues: Array<{
    code: string;
    message: string;
    severity: 'error' | 'warning';
    templateKey?: string;
    sectionType?: string;
  }>;
}

export interface DiagnosticIssue {
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source?: string;
  code?: string;
}

export interface LiquidObjectProperty {
  name: string;
  type: string;
  description?: string;
}

export interface LiquidObjectSchema {
  name: string;
  description?: string;
  properties: LiquidObjectProperty[];
}

export interface CompletionContext {
  fileKind: ThemeFileKind;
  inSchemaBlock: boolean;
  inLiquidTag: boolean;
  inLiquidOutput: boolean;
  objectChain: string[];
  jsonPath: string[];
  prefix: string;
  sectionType?: string;
  metaObjectSlug?: string;
}

export interface CrossFileReference {
  fromPath: string;
  fromLine: number;
  fromColumn: number;
  toPath: string;
  kind: 'snippet' | 'section-type' | 'setting-id' | 'block-type';
  symbol: string;
}
