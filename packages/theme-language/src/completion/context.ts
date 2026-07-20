import { getAllFilters } from '../catalog/filters';
import { getAllTags } from '../catalog/tags';
import type { CompletionContext } from '../types';
import type { ThemeWorkspace } from '../workspace/index';
import {
  getLineAtOffset,
  isInsideSchemaBlock,
  positionToOffset,
} from '../parsers/liquid-document';
import { resolveFileContext } from '../workspace/file-context';

export function resolveCompletionContext(
  workspace: ThemeWorkspace,
  filePath: string,
  line: number,
  column: number,
): CompletionContext {
  const content = workspace.getFile(filePath) ?? '';
  const offset = positionToOffset(content, line, column);
  const fileCtx = resolveFileContext(filePath);
  const lineText = getLineAtOffset(content, offset);
  const beforeCursor = lineText.slice(0, column);

  const inSchemaBlock = filePath.endsWith('.liquid') && isInsideSchemaBlock(content, offset);
  const inLiquidTag = /\{%-?\s*[\w-]*$/.test(beforeCursor) || /\{%-?\s+\w+\s+[^%]*$/.test(beforeCursor);
  const inLiquidOutput = /\{\{-?\s*[^}]*$/.test(beforeCursor) || /\|\s*[\w-]*$/.test(beforeCursor);

  const objectChain = extractObjectChain(beforeCursor);
  const jsonPath = inSchemaBlock || filePath.endsWith('.json')
    ? extractJsonPath(content, offset, inSchemaBlock)
    : [];
  const prefix = extractPrefix(beforeCursor, inLiquidTag, inLiquidOutput, inSchemaBlock);

  return {
    fileKind: fileCtx.kind,
    inSchemaBlock,
    inLiquidTag,
    inLiquidOutput,
    objectChain,
    jsonPath,
    prefix,
    sectionType: fileCtx.sectionType,
    metaObjectSlug: fileCtx.metaObjectSlug,
  };
}

function extractObjectChain(beforeCursor: string): string[] {
  const outputMatch = beforeCursor.match(/\{%-?\s*([\w.[\]'"]+)$/);
  if (!outputMatch?.[1]) return [];
  const expr = outputMatch[1].replace(/['"]/g, '').replace(/\[\d+\]/g, '');
  return expr.split('.').filter(Boolean);
}

function extractJsonPath(content: string, offset: number, inSchemaBlock: boolean): string[] {
  let slice = content.slice(0, offset);
  if (inSchemaBlock) {
    const schemaStart = content.indexOf('{% schema %}');
    if (schemaStart >= 0) {
      slice = content.slice(schemaStart, offset);
    }
  }
  const path: string[] = [];
  const keyRegex = /"([^"]+)"\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = keyRegex.exec(slice)) !== null) {
    path.push(match[1]!);
  }
  return path;
}

function extractPrefix(
  beforeCursor: string,
  inLiquidTag: boolean,
  inLiquidOutput: boolean,
  inSchemaBlock: boolean,
): string {
  if (inLiquidTag) {
    const tagMatch = beforeCursor.match(/\{%-?\s*([\w-]*)$/);
    if (tagMatch) return tagMatch[1] ?? '';
    const argMatch = beforeCursor.match(/['"]([\w-]*)$/);
    if (argMatch) return argMatch[1] ?? '';
  }
  if (inLiquidOutput) {
    const filterMatch = beforeCursor.match(/\|\s*([\w-]*)$/);
    if (filterMatch) return filterMatch[1] ?? '';
    const objMatch = beforeCursor.match(/(?:^|[\s.{])((?:[\w-]+\.)*[\w-]*)$/);
    if (objMatch) {
      const parts = objMatch[1]!.split('.');
      return parts[parts.length - 1] ?? '';
    }
  }
  if (inSchemaBlock || beforeCursor.includes('"')) {
    const jsonMatch = beforeCursor.match(/"([\w-]*)$/);
    if (jsonMatch) return jsonMatch[1] ?? '';
  }
  const wordMatch = beforeCursor.match(/([\w-]*)$/);
  return wordMatch?.[1] ?? '';
}

export function resolveCompletionItems(context: CompletionContext, workspace: ThemeWorkspace): Array<{
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
  insertText?: string;
}> {
  const items: Array<{
    label: string;
    kind: string;
    detail?: string;
    documentation?: string;
    insertText?: string;
  }> = [];
  const catalog = workspace.catalog;
  const prefix = context.prefix.toLowerCase();

  if (context.inLiquidTag && !context.inSchemaBlock) {
    for (const tag of getAllTags()) {
      if (!tag.name.startsWith(prefix) && prefix) continue;
      items.push({
        label: tag.name,
        kind: 'keyword',
        detail: 'tag',
        documentation: tag.description,
        insertText: tag.snippet ?? tag.name,
      });
    }
    if (context.fileKind === 'section' || context.fileKind === 'snippet' || context.fileKind === 'layout') {
      for (const snippet of catalog.getSnippets()) {
        if (prefix && !snippet.startsWith(prefix)) continue;
        items.push({
          label: snippet,
          kind: 'reference',
          detail: 'snippet',
          insertText: `'${snippet}'`,
        });
      }
    }
    return items;
  }

  if (context.inLiquidOutput && !context.inSchemaBlock) {
    if (context.objectChain.length > 0) {
      const chain = context.objectChain.join('.');
      const parent = chain.includes('.') ? chain.slice(0, chain.lastIndexOf('.')) : chain;
      const obj = catalog.getObject(parent || chain, {
        sectionType: context.sectionType,
        metaObjectSlug: context.metaObjectSlug,
      });
      if (obj) {
        for (const prop of obj.properties) {
          if (prefix && !prop.name.startsWith(prefix)) continue;
          items.push({
            label: prop.name,
            kind: 'property',
            detail: prop.type,
            documentation: prop.description,
          });
        }
      }
      return items;
    }

    const filterMatch = context.prefix === '' && context.objectChain.length === 0;
    if (filterMatch || context.prefix) {
      for (const filter of getAllFilters()) {
        if (prefix && !filter.name.startsWith(prefix)) continue;
        items.push({
          label: filter.name,
          kind: 'function',
          detail: 'filter',
          documentation: filter.description,
        });
      }
    }

    for (const obj of catalog.getGlobalObjects()) {
      if (prefix && !obj.name.startsWith(prefix)) continue;
      items.push({
        label: obj.name,
        kind: 'variable',
        detail: 'object',
        documentation: obj.description,
      });
    }

    if (context.sectionType) {
      items.push({ label: 'section', kind: 'variable', detail: 'object' });
      items.push({ label: 'block', kind: 'variable', detail: 'object' });
    }

    return items;
  }

  if (context.inSchemaBlock || (context.fileKind === 'template' && context.jsonPath.length > 0)) {
    const lastKey = context.jsonPath[context.jsonPath.length - 1];
    if (lastKey === 'type' && context.jsonPath.includes('sections')) {
      for (const type of catalog.getSectionTypes()) {
        if (prefix && !type.startsWith(prefix)) continue;
        items.push({ label: type, kind: 'enum', detail: 'section type' });
      }
    } else if (lastKey === 'type' && context.jsonPath.includes('blocks')) {
      const sectionTypeKey = findSectionTypeInJsonPath(context.jsonPath, workspace, context.sectionType);
      const schema = sectionTypeKey ? workspace.snapshot.sectionSchemas[sectionTypeKey] : null;
      for (const block of schema?.blocks ?? []) {
        if (prefix && !block.type.startsWith(prefix)) continue;
        items.push({ label: block.type, kind: 'enum', detail: 'block type' });
      }
    } else if (lastKey === 'type' || context.jsonPath.includes('settings')) {
      for (const type of catalog.getSettingTypes()) {
        if (prefix && !type.startsWith(prefix)) continue;
        items.push({ label: type, kind: 'enum', detail: 'setting type' });
      }
    }
    return items;
  }

  if (context.fileKind === 'template' && !prefix) {
    for (const type of catalog.getSectionTypes()) {
      items.push({ label: type, kind: 'enum', detail: 'section type' });
    }
  }

  return items;
}

function findSectionTypeInJsonPath(
  jsonPath: string[],
  workspace: ThemeWorkspace,
  fallbackSectionType?: string,
): string | undefined {
  if (fallbackSectionType) return fallbackSectionType;
  return workspace.catalog.getSectionTypes()[0];
}
