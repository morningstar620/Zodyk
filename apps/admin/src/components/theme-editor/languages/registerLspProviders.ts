import type { Monaco } from '@monaco-editor/react';
import type MonacoEditor from 'monaco-editor';

type SendRequest = <T>(method: string, params?: unknown) => Promise<T>;

export function registerLspMonacoProviders(
  monaco: Monaco,
  sendRequest: SendRequest,
): MonacoEditor.IDisposable[] {
  const languages = ['zodyk-liquid', 'json', 'css', 'javascript', 'typescript'];
  const disposables: MonacoEditor.IDisposable[] = [];

  disposables.push(
    monaco.languages.registerCompletionItemProvider(languages, {
      triggerCharacters: ['.', '|', '{', ' ', '"', "'"],
      provideCompletionItems: async (model, position) => {
        const uri = model.uri.toString();
        if (!uri.startsWith('zodyk://')) return { suggestions: [] };
        try {
          const result = await sendRequest<{ items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
            'textDocument/completion',
            {
              textDocument: { uri },
              position: { line: position.lineNumber - 1, character: position.column - 1 },
            },
          );
          const items = Array.isArray(result) ? result : (result?.items ?? []);
          return {
            suggestions: items.map((item) => ({
              label: String(item.label ?? ''),
              kind: mapCompletionKind(monaco, item.kind as number | undefined),
              detail: item.detail as string | undefined,
              insertText: String(item.insertText ?? item.label ?? ''),
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
            })),
          };
        } catch {
          return { suggestions: [] };
        }
      },
    }),
  );

  disposables.push(
    monaco.languages.registerHoverProvider(languages, {
      provideHover: async (model, position) => {
        const uri = model.uri.toString();
        if (!uri.startsWith('zodyk://')) return null;
        try {
          const result = await sendRequest<{ contents?: { value: string } | Array<{ value: string }> } | null>(
            'textDocument/hover',
            {
              textDocument: { uri },
              position: { line: position.lineNumber - 1, character: position.column - 1 },
            },
          );
          if (!result?.contents) return null;
          const contents = Array.isArray(result.contents) ? result.contents : [result.contents];
          return {
            contents: contents.map((c) => ({ value: c.value })),
          };
        } catch {
          return null;
        }
      },
    }),
  );

  disposables.push(
    monaco.languages.registerDefinitionProvider(languages, {
      provideDefinition: async (model, position) => {
        const uri = model.uri.toString();
        if (!uri.startsWith('zodyk://')) return null;
        try {
          const result = await sendRequest<
            | { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }
            | Array<{ uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }>
            | null
          >('textDocument/definition', {
            textDocument: { uri },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
          });
          if (!result) return null;
          const locations = Array.isArray(result) ? result : [result];
          return locations.map((loc) => ({
            uri: monaco.Uri.parse(loc.uri),
            range: {
              startLineNumber: loc.range.start.line + 1,
              startColumn: loc.range.start.character + 1,
              endLineNumber: loc.range.end.line + 1,
              endColumn: loc.range.end.character + 1,
            },
          }));
        } catch {
          return null;
        }
      },
    }),
  );

  return disposables;
}

function mapCompletionKind(monaco: Monaco, kind?: number): MonacoEditor.languages.CompletionItemKind {
  const kinds = monaco.languages.CompletionItemKind;
  switch (kind) {
    case 14: return kinds.Keyword;
    case 3: return kinds.Function;
    case 10: return kinds.Property;
    case 6: return kinds.Variable;
    case 13: return kinds.Enum;
    case 21: return kinds.Reference;
    default: return kinds.Text;
  }
}
