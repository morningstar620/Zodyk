export * from './types';
export * from './catalog/index';
export * from './workspace/index';
export * from './workspace/file-context';
export { buildCrossFileIndex, ThemeWorkspaceIndex, listThemePaths } from './workspace/cross-file-index';
export * from './cache/parse-cache';
export * from './parsers/index';
export * from './completion/index';

export { createThemeWorkspace, ThemeWorkspace } from './workspace/index';
export { resolveFileKind, resolveLanguageId, resolveFileContext, sectionTypeFromPath, snippetNameFromPath } from './workspace/file-context';
export { ThemeCatalog } from './catalog/objects';
export { resolveCompletionContext, resolveCompletionItems } from './completion/context';
export { parseFileDiagnostics } from './parsers/index';
export { flattenLocaleJson } from './parsers/locale-json';
export { getAllTags, getTag, getAllFilters, getFilter } from './catalog/index';
