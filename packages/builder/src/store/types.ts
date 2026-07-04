import type { SectionDefinition, SectionSetting, TemplateJson } from '@zodyk/core';

export type EditorMode = 'sections' | 'theme_settings';
export type DeviceMode = 'desktop' | 'tablet' | 'mobile';
export type SectionGroupName = 'header' | 'template' | 'footer';

export interface PageOption {
  id: string;
  label: string;
  templatePath: string;
  pathname: string;
  group: string;
}

export interface CustomizerSnapshot {
  templateJson: TemplateJson;
  themeSettings: Record<string, unknown>;
}

export interface EditorMeta {
  displayNames: Record<string, string>;
  hiddenSections: Record<string, boolean>;
  recentlyUsedSections: string[];
  accordionExpanded: Record<string, boolean>;
  expandedSections: Record<string, boolean>;
}

export interface HoverTarget {
  sectionId: string;
  blockId?: string;
}

export interface ThemeMeta {
  themeId: string;
  themeName: string;
  previewToken: string;
  websiteUrl: string;
}

export interface SchemasData {
  sectionSchemas: Record<string, SectionDefinition>;
  sectionTypeList?: string[];
  settingsSchema: Array<{ name: string; settings: SectionSetting[] }>;
  themeSettings: Record<string, unknown>;
}
