import {
  createThemeWorkspace,
  parseFileDiagnostics,
  resolveCompletionContext,
  resolveCompletionItems,
  getTag,
  getFilter,
  type ThemeWorkspace,
  type ThemeWorkspaceSnapshot,
} from '@zodyk/theme-language';
import {
  TextDocument,
  type Diagnostic,
  DiagnosticSeverity,
  CompletionItemKind,
  type CompletionItem,
  type Hover,
  MarkupKind,
  type Location,
  type Definition,
  type ReferenceContext,
  type RenameFile,
  type TextEdit,
  type DocumentSymbol,
  SymbolKind,
  type TextDocumentEdit,
  type WorkspaceEdit,
} from 'vscode-languageserver';

const DIAGNOSTIC_DEBOUNCE_MS = 300;

export class ThemeLanguageServerState {
  workspace: ThemeWorkspace | null = null;
  documents = new Map<string, TextDocument>();
  private diagnosticTimers = new Map<string, ReturnType<typeof setTimeout>>();

  initWorkspace(snapshot: ThemeWorkspaceSnapshot): void {
    this.workspace = createThemeWorkspace(snapshot);
  }

  updateWorkspace(snapshot: ThemeWorkspaceSnapshot): void {
    if (this.workspace) {
      this.workspace.updateSnapshot(snapshot);
    } else {
      this.initWorkspace(snapshot);
    }
  }

  syncDocument(uri: string, text: string, version: number): TextDocument {
    const doc = TextDocument.create(uri, detectLanguage(uri), version, text);
    this.documents.set(uri, doc);
    const path = uriToPath(uri);
    if (this.workspace && path) {
      this.workspace.updateFile(path, text, version);
    }
    return doc;
  }

  scheduleDiagnostics(uri: string, send: (uri: string, diagnostics: Diagnostic[]) => void): void {
    const existing = this.diagnosticTimers.get(uri);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      send(uri, this.getDiagnostics(uri));
      this.diagnosticTimers.delete(uri);
    }, DIAGNOSTIC_DEBOUNCE_MS);
    this.diagnosticTimers.set(uri, timer);
  }

  getDiagnostics(uri: string): Diagnostic[] {
    const doc = this.documents.get(uri);
    if (!doc || !this.workspace) return [];
    const path = uriToPath(uri);
    if (!path) return [];

    const issues = parseFileDiagnostics(path, doc.getText(), this.workspace.snapshot);
    return issues.map((issue) => ({
      range: {
        start: { line: Math.max(0, issue.line - 1), character: Math.max(0, (issue.column ?? 1) - 1) },
        end: {
          line: Math.max(0, (issue.endLine ?? issue.line) - 1),
          character: Math.max(0, (issue.endColumn ?? (issue.column ?? 1) + 1) - 1),
        },
      },
      message: issue.message,
      severity:
        issue.severity === 'error'
          ? DiagnosticSeverity.Error
          : issue.severity === 'warning'
            ? DiagnosticSeverity.Warning
            : DiagnosticSeverity.Information,
      source: issue.source ?? 'zodyk',
      code: issue.code,
    }));
  }

  getCompletions(uri: string, line: number, character: number): CompletionItem[] {
    if (!this.workspace) return [];
    const path = uriToPath(uri);
    if (!path) return [];

    const ctx = resolveCompletionContext(this.workspace, path, line + 1, character + 1);
    const raw = resolveCompletionItems(ctx, this.workspace);

    return raw.map((item) => ({
      label: item.label,
      kind: mapCompletionKind(item.kind),
      detail: item.detail,
      documentation: item.documentation
        ? { kind: MarkupKind.PlainText, value: item.documentation }
        : undefined,
      insertText: item.insertText ?? item.label,
    }));
  }

  getHover(uri: string, line: number, character: number): Hover | null {
    if (!this.workspace) return null;
    const doc = this.documents.get(uri);
    if (!doc) return null;
    const path = uriToPath(uri);
    if (!path) return null;

    const lineText = doc.getText({
      start: { line, character: 0 },
      end: { line, character: Number.MAX_SAFE_INTEGER },
    });
    const word = getWordAt(lineText, character);
    if (!word) return null;

    const tag = getTag(word);
    if (tag) {
      return {
        contents: { kind: MarkupKind.Markdown, value: `**${tag.name}** tag\n\n${tag.description}` },
      };
    }

    const filter = getFilter(word);
    if (filter) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**${filter.name}** filter\n\n${filter.description}${filter.args ? `\n\nArgs: \`${filter.args}\`` : ''}`,
        },
      };
    }

    const obj = this.workspace.catalog.getObject(word, {
      sectionType: path.startsWith('sections/') ? path.replace('sections/', '').replace('.liquid', '') : undefined,
    });
    if (obj) {
      const props = obj.properties.map((p) => `- \`${p.name}\`: ${p.type}${p.description ? ` — ${p.description}` : ''}`).join('\n');
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**${obj.name}**\n\n${obj.description ?? ''}\n\n${props ? `Properties:\n${props}` : ''}`,
        },
      };
    }

    return null;
  }

  getDefinition(uri: string, line: number, character: number): Definition | null {
    if (!this.workspace) return null;
    const doc = this.documents.get(uri);
    if (!doc) return null;
    const path = uriToPath(uri);
    if (!path) return null;

    const lineText = doc.getText({
      start: { line, character: 0 },
      end: { line, character: Number.MAX_SAFE_INTEGER },
    });

    const renderMatch = lineText.slice(0, character).match(/['"]([\w-]+)$/);
    if (renderMatch && /render|include/.test(lineText)) {
      const snippet = renderMatch[1]!;
      const target = this.workspace.index.findDefinition(snippet, 'snippet');
      if (target) return locationForPath(this.workspace.themeId, target);
    }

    const typeMatch = lineText.match(/"type"\s*:\s*"([^"]+)"/);
    if (typeMatch) {
      const idx = lineText.indexOf(typeMatch[0]) + typeMatch[0].indexOf(typeMatch[1]!);
      if (character >= idx && character <= idx + typeMatch[1]!.length) {
        const target = this.workspace.index.findDefinition(typeMatch[1]!, 'section-type');
        if (target) return locationForPath(this.workspace.themeId, target);
      }
    }

    const refs = this.workspace.index.getReferencesAt(path, line + 1);
    const ref = refs.find((r) => character >= r.fromColumn - 1 && character <= r.fromColumn + r.symbol.length);
    if (ref) {
      if (ref.kind === 'snippet' || ref.kind === 'section-type') {
        const target = this.workspace.index.findDefinition(ref.symbol, ref.kind);
        if (target) return locationForPath(this.workspace.themeId, target);
      }
    }

    return null;
  }

  getReferences(uri: string, line: number, character: number, _ctx: ReferenceContext): Location[] {
    if (!this.workspace) return [];
    const doc = this.documents.get(uri);
    if (!doc) return [];
    const path = uriToPath(uri);
    if (!path) return [];

    const lineText = doc.getText({
      start: { line, character: 0 },
      end: { line, character: Number.MAX_SAFE_INTEGER },
    });
    const word = getWordAt(lineText, character);
    if (!word) return [];

    const snippetRefs = this.workspace.index.findReferences(word, 'snippet');
    const sectionRefs = this.workspace.index.findReferences(word, 'section-type');

    const locations: Location[] = [];
    for (const ref of [...snippetRefs, ...sectionRefs]) {
      locations.push({
        uri: pathToUri(this.workspace.themeId, ref.fromPath),
        range: {
          start: { line: ref.fromLine - 1, character: ref.fromColumn - 1 },
          end: { line: ref.fromLine - 1, character: ref.fromColumn + ref.symbol.length - 1 },
        },
      });
    }

    const snippetPath = `snippets/${word}.liquid`;
    const sectionPath = `sections/${word}.liquid`;
    if (this.workspace.snapshot.files[snippetPath]) {
      locations.push(locationForPath(this.workspace.themeId, snippetPath)!);
    }
    if (this.workspace.snapshot.files[sectionPath]) {
      locations.push(locationForPath(this.workspace.themeId, sectionPath)!);
    }

    return locations;
  }

  rename(uri: string, line: number, character: number, newName: string): WorkspaceEdit | null {
    if (!this.workspace) return null;
    const doc = this.documents.get(uri);
    if (!doc) return null;
    const path = uriToPath(uri);
    if (!path) return null;

    const lineText = doc.getText({
      start: { line, character: 0 },
      end: { line, character: Number.MAX_SAFE_INTEGER },
    });
    const word = getWordAt(lineText, character);
    if (!word) return null;

    const changes: Record<string, TextEdit[]> = {};
    const fileChanges: RenameFile[] = [];

    const snippetPath = `snippets/${word}.liquid`;
    const newSnippetPath = `snippets/${newName}.liquid`;
    if (path === snippetPath && this.workspace.snapshot.files[snippetPath]) {
      fileChanges.push({
        kind: 'rename',
        oldUri: pathToUri(this.workspace.themeId, snippetPath),
        newUri: pathToUri(this.workspace.themeId, newSnippetPath),
      });
    }

    for (const ref of this.workspace.index.findReferences(word, 'snippet')) {
      const refUri = pathToUri(this.workspace.themeId, ref.fromPath);
      const refDoc = this.documents.get(refUri);
      const content = refDoc?.getText() ?? this.workspace.getFile(ref.fromPath) ?? '';
      const lines = content.split('\n');
      const refLine = lines[ref.fromLine - 1] ?? '';
      const updated = refLine.replace(
        new RegExp(`(['"])${word}\\1`),
        `$1${newName}$1`,
      );
      if (updated !== refLine) {
        changes[refUri] = changes[refUri] ?? [];
        changes[refUri]!.push({
          range: {
            start: { line: ref.fromLine - 1, character: 0 },
            end: { line: ref.fromLine - 1, character: refLine.length },
          },
          newText: updated,
        });
      }
    }

    const documentChanges: (TextDocumentEdit | RenameFile)[] = [
      ...fileChanges,
      ...Object.entries(changes).map(([editUri, edits]) => ({
        textDocument: { uri: editUri, version: this.documents.get(editUri)?.version ?? null },
        edits,
      })),
    ];

    if (documentChanges.length === 0) return null;
    return { documentChanges };
  }

  getDocumentSymbols(uri: string): DocumentSymbol[] {
    if (!this.workspace) return [];
    const doc = this.documents.get(uri);
    if (!doc) return [];
    const path = uriToPath(uri);
    if (!path) return [];

    const symbols: DocumentSymbol[] = [];
    const content = doc.getText();

    if (path.startsWith('templates/') && path.endsWith('.json')) {
      try {
        const json = JSON.parse(content) as { sections?: Record<string, { type: string }>; order?: string[] };
        for (const id of json.order ?? Object.keys(json.sections ?? {})) {
          const section = json.sections?.[id];
          if (section) {
            symbols.push({
              name: `${id} (${section.type})`,
              kind: SymbolKind.Module,
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
              selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            });
          }
        }
      } catch {
        // ignore
      }
    }

    if (path.endsWith('.liquid')) {
      const assignRegex = /\{%-?\s*assign\s+(\w+)/g;
      let match: RegExpExecArray | null;
      while ((match = assignRegex.exec(content)) !== null) {
        const line = content.slice(0, match.index).split('\n').length - 1;
        symbols.push({
          name: match[1]!,
          kind: SymbolKind.Variable,
          range: { start: { line, character: 0 }, end: { line, character: 0 } },
          selectionRange: { start: { line, character: 0 }, end: { line, character: 0 } },
        });
      }
    }

    return symbols;
  }

  formatDocument(uri: string): TextEdit[] {
    const doc = this.documents.get(uri);
    if (!doc) return [];
    const path = uriToPath(uri);
    if (!path) return [];

    if (path.endsWith('.json')) {
      try {
        const formatted = JSON.stringify(JSON.parse(doc.getText()), null, 2);
        return [{
          range: {
            start: { line: 0, character: 0 },
            end: { line: doc.lineCount, character: 0 },
          },
          newText: formatted,
        }];
      } catch {
        return [];
      }
    }

    return [];
  }
}

function mapCompletionKind(kind: string): CompletionItemKind {
  switch (kind) {
    case 'keyword': return CompletionItemKind.Keyword;
    case 'function': return CompletionItemKind.Function;
    case 'property': return CompletionItemKind.Property;
    case 'variable': return CompletionItemKind.Variable;
    case 'enum': return CompletionItemKind.Enum;
    case 'reference': return CompletionItemKind.Reference;
    default: return CompletionItemKind.Text;
  }
}

export function pathToUri(themeId: string, path: string): string {
  return `zodyk://theme/${themeId}/${path}`;
}

export function uriToPath(uri: string): string | null {
  const match = uri.match(/^zodyk:\/\/theme\/[^/]+\/(.+)$/);
  return match?.[1] ?? null;
}

export function detectLanguage(uri: string): string {
  const path = uriToPath(uri);
  if (!path) return 'plaintext';
  if (path.endsWith('.liquid')) return 'zodyk-liquid';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.ts')) return 'typescript';
  return 'plaintext';
}

function locationForPath(themeId: string, path: string): Location {
  return {
    uri: pathToUri(themeId, path),
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
  };
}

function getWordAt(line: string, character: number): string | null {
  const before = line.slice(0, character);
  const match = before.match(/['"]?([\w-]+)['"]?$/);
  return match?.[1] ?? null;
}
