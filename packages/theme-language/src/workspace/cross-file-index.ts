import type { CrossFileReference, ThemeWorkspaceSnapshot } from '../types';
import { splitSectionLiquid } from '@zodyk/liquid';
import { getCachedSplit, setCachedSplit } from '../cache/parse-cache';

const RENDER_REGEX = /\{%-?\s*render\s+['"]([^'"]+)['"]/g;
const INCLUDE_REGEX = /\{%-?\s*include\s+['"]([^'"]+)['"]/g;
const SECTION_TYPE_REGEX = /"type"\s*:\s*"([^"]+)"/g;
const SETTING_ID_REGEX = /"id"\s*:\s*"([^"]+)"/g;

function cachedSplit(path: string, content: string) {
  const cached = getCachedSplit(path, content);
  if (cached) return cached;
  const result = splitSectionLiquid(content);
  setCachedSplit(path, content, result);
  return result;
}

function indexLiquidFile(path: string, content: string, refs: CrossFileReference[]): void {
  const { markup } = cachedSplit(path, content);
  let match: RegExpExecArray | null;

  RENDER_REGEX.lastIndex = 0;
  while ((match = RENDER_REGEX.exec(markup)) !== null) {
    const line = content.slice(0, match.index).split('\n').length;
    const col = match.index - content.lastIndexOf('\n', match.index);
    refs.push({
      fromPath: path,
      fromLine: line,
      fromColumn: col,
      toPath: `snippets/${match[1]}.liquid`,
      kind: 'snippet',
      symbol: match[1]!,
    });
  }

  INCLUDE_REGEX.lastIndex = 0;
  while ((match = INCLUDE_REGEX.exec(markup)) !== null) {
    const line = content.slice(0, match.index).split('\n').length;
    const col = match.index - content.lastIndexOf('\n', match.index);
    refs.push({
      fromPath: path,
      fromLine: line,
      fromColumn: col,
      toPath: `snippets/${match[1]}.liquid`,
      kind: 'snippet',
      symbol: match[1]!,
    });
  }
}

function indexTemplateFile(path: string, content: string, refs: CrossFileReference[]): void {
  let match: RegExpExecArray | null;
  SECTION_TYPE_REGEX.lastIndex = 0;
  while ((match = SECTION_TYPE_REGEX.exec(content)) !== null) {
    const symbol = match[1]!;
    const line = content.slice(0, match.index).split('\n').length;
    const col = match.index - content.lastIndexOf('\n', match.index);
    refs.push({
      fromPath: path,
      fromLine: line,
      fromColumn: col,
      toPath: `sections/${symbol}.liquid`,
      kind: 'section-type',
      symbol,
    });
  }
}

function indexSectionSchema(path: string, content: string, refs: CrossFileReference[]): void {
  const { schemaJson } = cachedSplit(path, content);
  if (!schemaJson) return;

  let match: RegExpExecArray | null;
  SETTING_ID_REGEX.lastIndex = 0;
  while ((match = SETTING_ID_REGEX.exec(schemaJson)) !== null) {
    const offset = content.indexOf(schemaJson) + match.index;
    const line = content.slice(0, offset).split('\n').length;
    const col = offset - content.lastIndexOf('\n', offset);
    refs.push({
      fromPath: path,
      fromLine: line,
      fromColumn: col,
      toPath: path,
      kind: 'setting-id',
      symbol: match[1]!,
    });
  }
}

function indexFile(path: string, content: string, refs: CrossFileReference[]): void {
  if (path.endsWith('.liquid')) {
    indexLiquidFile(path, content, refs);
  }
  if (path.startsWith('templates/') && path.endsWith('.json')) {
    indexTemplateFile(path, content, refs);
  }
  if (path.startsWith('sections/') && path.endsWith('.liquid')) {
    indexSectionSchema(path, content, refs);
  }
}

export function buildCrossFileIndex(files: Record<string, string>): CrossFileReference[] {
  const refs: CrossFileReference[] = [];
  for (const [path, content] of Object.entries(files)) {
    indexFile(path, content, refs);
  }
  return refs;
}

function buildSecondaryIndexes(refs: CrossFileReference[]) {
  const refsByFromPath = new Map<string, CrossFileReference[]>();
  const refsBySymbol = new Map<string, CrossFileReference[]>();

  for (const ref of refs) {
    const fromList = refsByFromPath.get(ref.fromPath) ?? [];
    fromList.push(ref);
    refsByFromPath.set(ref.fromPath, fromList);

    const symKey = `${ref.kind}:${ref.symbol}`;
    const symList = refsBySymbol.get(symKey) ?? [];
    symList.push(ref);
    refsBySymbol.set(symKey, symList);
  }

  return { refsByFromPath, refsBySymbol };
}

export class ThemeWorkspaceIndex {
  private refs: CrossFileReference[] = [];
  private refsByFromPath = new Map<string, CrossFileReference[]>();
  private refsBySymbol = new Map<string, CrossFileReference[]>();

  constructor(
    private workspace: ThemeWorkspaceSnapshot,
    options?: { refs?: CrossFileReference[] },
  ) {
    if (options?.refs?.length) {
      this.hydrateRefs(options.refs);
    } else if (workspace.crossFileRefs?.length) {
      this.hydrateRefs(workspace.crossFileRefs);
    } else {
      this.rebuild();
    }
  }

  updateWorkspace(workspace: ThemeWorkspaceSnapshot): void {
    this.workspace = workspace;
    if (workspace.crossFileRefs?.length) {
      this.hydrateRefs(workspace.crossFileRefs);
    } else {
      this.rebuild();
    }
  }

  getReferences(): CrossFileReference[] {
    return this.refs;
  }

  getReferencesAt(path: string, line: number): CrossFileReference[] {
    return (this.refsByFromPath.get(path) ?? []).filter((r) => r.fromLine === line);
  }

  findReferences(symbol: string, kind: CrossFileReference['kind']): CrossFileReference[] {
    return this.refsBySymbol.get(`${kind}:${symbol}`) ?? [];
  }

  findDefinition(symbol: string, kind: CrossFileReference['kind']): string | undefined {
    switch (kind) {
      case 'snippet':
        return this.workspace.files[`snippets/${symbol}.liquid`] ? `snippets/${symbol}.liquid` : undefined;
      case 'section-type':
        return this.workspace.files[`sections/${symbol}.liquid`] ? `sections/${symbol}.liquid` : undefined;
      default:
        return undefined;
    }
  }

  hydrateRefs(refs: CrossFileReference[]): void {
    this.refs = refs;
    const secondary = buildSecondaryIndexes(refs);
    this.refsByFromPath = secondary.refsByFromPath;
    this.refsBySymbol = secondary.refsBySymbol;
  }

  rebuild(): void {
    const files: Record<string, string> = {};
    for (const [path, file] of Object.entries(this.workspace.files)) {
      files[path] = file.content;
    }
    this.hydrateRefs(buildCrossFileIndex(files));
  }

  updateFile(path: string, content: string): void {
    const added: CrossFileReference[] = [];
    indexFile(path, content, added);
    this.hydrateRefs([...this.refs.filter((r) => r.fromPath !== path), ...added]);
  }
}

export function listThemePaths(files: Record<string, { content: string }>): {
  snippets: string[];
  sectionTypes: string[];
  templates: string[];
} {
  const paths = Object.keys(files);
  return {
    snippets: paths
      .filter((p) => p.startsWith('snippets/') && p.endsWith('.liquid'))
      .map((p) => p.replace('snippets/', '').replace('.liquid', '')),
    sectionTypes: paths
      .filter((p) => p.startsWith('sections/') && p.endsWith('.liquid'))
      .map((p) => p.replace('sections/', '').replace('.liquid', '')),
    templates: paths.filter((p) => p.startsWith('templates/') && p.endsWith('.json')),
  };
}
