export type ViewType = 'home' | 'page' | 'meta_archive' | 'meta_single' | 'not_found';

export interface TemplateResolveOptions {
  view: ViewType;
  pageTemplateSuffix?: string;
  metaTemplateKey?: string;
  metaEntryTemplateSuffix?: string;
}

export interface ResolvedTemplate {
  path: string;
  templateKey: string;
  fallbackUsed: boolean;
}

const DEFAULT_ARCHIVE = '_default.archive.json';
const DEFAULT_SINGLE = '_default.single.json';

export function resolveTemplatePath(
  themeFiles: Set<string> | string[],
  options: TemplateResolveOptions,
): ResolvedTemplate | null {
  const files = themeFiles instanceof Set ? themeFiles : new Set(themeFiles);
  const has = (path: string) => files.has(path);

  switch (options.view) {
    case 'home': {
      const path = 'templates/index.json';
      return has(path) ? { path, templateKey: 'index', fallbackUsed: false } : null;
    }
    case 'page': {
      if (options.pageTemplateSuffix) {
        const specific = `templates/page.${options.pageTemplateSuffix}.json`;
        if (has(specific)) {
          return {
            path: specific,
            templateKey: `page.${options.pageTemplateSuffix}`,
            fallbackUsed: false,
          };
        }
      }
      const fallback = 'templates/page.json';
      if (has(fallback)) {
        return {
          path: fallback,
          templateKey: 'page',
          fallbackUsed: Boolean(options.pageTemplateSuffix),
        };
      }
      return null;
    }
    case 'meta_archive': {
      const key = options.metaTemplateKey ?? 'default';
      const specific = `templates/${key}.archive.json`;
      if (has(specific)) {
        return { path: specific, templateKey: `${key}.archive`, fallbackUsed: false };
      }
      const fallback = `templates/${DEFAULT_ARCHIVE}`;
      if (has(fallback)) {
        return { path: fallback, templateKey: '_default.archive', fallbackUsed: true };
      }
      return null;
    }
    case 'meta_single': {
      const key = options.metaTemplateKey ?? 'default';
      if (options.metaEntryTemplateSuffix) {
        const entrySpecific = `templates/${key}.single.${options.metaEntryTemplateSuffix}.json`;
        if (has(entrySpecific)) {
          return {
            path: entrySpecific,
            templateKey: `${key}.single.${options.metaEntryTemplateSuffix}`,
            fallbackUsed: false,
          };
        }
      }
      const specific = `templates/${key}.single.json`;
      if (has(specific)) {
        return {
          path: specific,
          templateKey: `${key}.single`,
          fallbackUsed: Boolean(options.metaEntryTemplateSuffix),
        };
      }
      const fallback = `templates/${DEFAULT_SINGLE}`;
      if (has(fallback)) {
        return { path: fallback, templateKey: '_default.single', fallbackUsed: true };
      }
      return null;
    }
    case 'not_found': {
      const path = 'templates/404.json';
      return has(path) ? { path, templateKey: '404', fallbackUsed: false } : null;
    }
    default:
      return null;
  }
}

export function listPageTemplates(themeFiles: string[]): string[] {
  return themeFiles
    .filter((f) => f.startsWith('templates/page.') && f.endsWith('.json') && f !== 'templates/page.json')
    .map((f) => f.replace('templates/page.', '').replace('.json', ''));
}

export function extractMetaTemplateKeys(themeFiles: string[]): string[] {
  const keys = new Set<string>();
  for (const file of themeFiles) {
    const archiveMatch = file.match(/^templates\/(.+)\.archive\.json$/);
    const singleMatch = file.match(/^templates\/(.+)\.single\.json$/);
    if (archiveMatch?.[1] && !archiveMatch[1].startsWith('_default')) {
      keys.add(archiveMatch[1]);
    }
    if (singleMatch?.[1] && !singleMatch[1].startsWith('_default')) {
      keys.add(singleMatch[1]);
    }
  }
  return [...keys];
}
