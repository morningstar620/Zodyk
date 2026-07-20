import type { ThemeFileKind } from '../types';

export function resolveFileKind(path: string): ThemeFileKind {
  if (path.startsWith('layout/')) return 'layout';
  if (path.startsWith('sections/')) return 'section';
  if (path.startsWith('snippets/')) return 'snippet';
  if (path.startsWith('templates/')) return 'template';
  if (path.startsWith('config/')) return 'config';
  if (path.startsWith('assets/')) return 'asset';
  if (path.startsWith('locales/')) return 'locale';
  return 'other';
}

export function resolveLanguageId(path: string): string {
  if (path.endsWith('.liquid')) return 'zodyk-liquid';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.ts')) return 'typescript';
  return 'plaintext';
}

export function sectionTypeFromPath(path: string): string | undefined {
  const match = path.match(/^sections\/(.+)\.liquid$/);
  return match?.[1];
}

export function snippetNameFromPath(path: string): string | undefined {
  const match = path.match(/^snippets\/(.+)\.liquid$/);
  return match?.[1];
}

export function inferMetaObjectSlugFromTemplate(path: string): string | undefined {
  const archiveMatch = path.match(/^templates\/(.+)\.archive\.json$/);
  if (archiveMatch?.[1] && !archiveMatch[1].startsWith('_default')) {
    return archiveMatch[1];
  }
  const singleMatch = path.match(/^templates\/(.+)\.single(?:\.[^/]+)?\.json$/);
  if (singleMatch?.[1] && !singleMatch[1].startsWith('_default')) {
    return singleMatch[1];
  }
  return undefined;
}

export interface FileContext {
  kind: ThemeFileKind;
  sectionType?: string;
  snippetName?: string;
  metaObjectSlug?: string;
}

export function resolveFileContext(path: string): FileContext {
  const kind = resolveFileKind(path);
  return {
    kind,
    sectionType: kind === 'section' ? sectionTypeFromPath(path) : undefined,
    snippetName: kind === 'snippet' ? snippetNameFromPath(path) : undefined,
    metaObjectSlug: kind === 'template' ? inferMetaObjectSlugFromTemplate(path) : undefined,
  };
}
