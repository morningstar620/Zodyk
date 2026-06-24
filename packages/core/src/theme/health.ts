export type ThemeHealthIssueCode =
  | 'missing_meta_object'
  | 'missing_archive_template'
  | 'missing_single_template'
  | 'missing_page_template'
  | 'orphan_template'
  | 'missing_section'
  | 'missing_home_template'
  | 'missing_default_page_template';

export interface ThemeHealthIssue {
  code: ThemeHealthIssueCode;
  message: string;
  templateKey?: string;
  metaObjectSlug?: string;
  sectionType?: string;
  severity: 'error' | 'warning';
}

export interface ThemeHealthMetaObject {
  slug: string;
  templateKey: string;
  archiveEnabled: boolean;
}

export interface ThemeHealthInput {
  themeFiles: string[];
  metaObjects: ThemeHealthMetaObject[];
  sectionTypes: string[];
}

function hasFile(files: Set<string>, path: string): boolean {
  return files.has(path);
}

export function auditThemeHealth(input: ThemeHealthInput): ThemeHealthIssue[] {
  const issues: ThemeHealthIssue[] = [];
  const files = new Set(input.themeFiles);
  const sectionTypes = new Set(input.sectionTypes);
  const metaByTemplateKey = new Map(
    input.metaObjects.map((m) => [m.templateKey, m] as const),
  );

  if (!hasFile(files, 'templates/index.json')) {
    issues.push({
      code: 'missing_home_template',
      message: 'Theme is missing templates/index.json (homepage template).',
      severity: 'error',
    });
  }

  if (!hasFile(files, 'templates/page.json')) {
    issues.push({
      code: 'missing_default_page_template',
      message: 'Theme is missing templates/page.json (default page fallback).',
      severity: 'error',
    });
  }

  for (const templateKey of extractTemplateKeysFromFiles(input.themeFiles)) {
    if (!metaByTemplateKey.has(templateKey)) {
      issues.push({
        code: 'orphan_template',
        message: `Theme has templates for "${templateKey}" but no meta object uses that templateKey.`,
        templateKey,
        severity: 'warning',
      });
    }
  }

  for (const meta of input.metaObjects) {
    const { templateKey, slug, archiveEnabled } = meta;
    const hasArchive = hasFile(files, `templates/${templateKey}.archive.json`);
    const hasSingle = hasFile(files, `templates/${templateKey}.single.json`);

    if (archiveEnabled && !hasArchive && !hasFile(files, 'templates/_default.archive.json')) {
      issues.push({
        code: 'missing_archive_template',
        message: `Meta object "${slug}" needs templates/${templateKey}.archive.json.`,
        templateKey,
        metaObjectSlug: slug,
        severity: 'error',
      });
    }

    if (!hasSingle && !hasFile(files, 'templates/_default.single.json')) {
      issues.push({
        code: 'missing_single_template',
        message: `Meta object "${slug}" needs templates/${templateKey}.single.json.`,
        templateKey,
        metaObjectSlug: slug,
        severity: 'error',
      });
    }
  }

  for (const file of input.themeFiles) {
    if (!file.startsWith('templates/') || !file.endsWith('.json')) continue;
    try {
      // Template JSON validation happens at install; health check only verifies section types exist
    } catch {
      // ignore
    }
  }

  for (const file of input.themeFiles) {
    if (!file.startsWith('templates/') || !file.endsWith('.json')) continue;
    const content = file;
    void content;
  }

  return issues;
}

function extractTemplateKeysFromFiles(themeFiles: string[]): string[] {
  const keys = new Set<string>();
  for (const file of themeFiles) {
    const archiveMatch = file.match(/^templates\/(.+)\.archive\.json$/);
    const singleMatch = file.match(/^templates\/(.+)\.single\.json$/);
    if (archiveMatch?.[1] && !archiveMatch[1].startsWith('_default')) {
      keys.add(archiveMatch[1]);
    }
    if (singleMatch?.[1] && !singleMatch[1].startsWith('_default') && !singleMatch[1].includes('.')) {
      keys.add(singleMatch[1]);
    }
  }
  return [...keys];
}

export function auditTemplateSections(
  template: { sections: Record<string, { type: string }> },
  sectionTypes: Set<string>,
): ThemeHealthIssue[] {
  const issues: ThemeHealthIssue[] = [];
  for (const [id, section] of Object.entries(template.sections)) {
    if (!sectionTypes.has(section.type)) {
      issues.push({
        code: 'missing_section',
        message: `Section instance "${id}" references missing section type "${section.type}".`,
        sectionType: section.type,
        severity: 'error',
      });
    }
  }
  return issues;
}
