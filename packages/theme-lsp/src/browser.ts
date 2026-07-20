import {
  createConnection,
  BrowserMessageReader,
  BrowserMessageWriter,
  ProposedFeatures,
} from 'vscode-languageserver/browser.js';
import { TextDocumentSyncKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { ThemeWorkspaceSnapshot } from '@zodyk/theme-language';
import { ThemeLanguageServerState, detectLanguage } from './server-state';

export function startThemeLanguageServer(): void {
  const connection = createConnection(
    ProposedFeatures.all,
    new BrowserMessageReader(self),
    new BrowserMessageWriter(self),
  );

  const state = new ThemeLanguageServerState();

  connection.onInitialize(() => ({
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ['.', '|', '{', ' ', '"', "'"],
        resolveProvider: false,
      },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      renameProvider: { prepareProvider: true },
      documentSymbolProvider: true,
      documentFormattingProvider: true,
    },
  }));

  connection.onNotification('zodyk/initWorkspace', (snapshot: ThemeWorkspaceSnapshot) => {
    state.initWorkspace(snapshot);
    for (const [path, file] of Object.entries(snapshot.files)) {
      const uri = `zodyk://theme/${snapshot.themeId}/${path}`;
      state.syncDocument(uri, file.content, file.version);
    }
  });

  connection.onNotification('zodyk/updateWorkspace', (snapshot: ThemeWorkspaceSnapshot) => {
    state.updateWorkspace(snapshot);
  });

  connection.onDidOpenTextDocument((params) => {
    state.syncDocument(
      params.textDocument.uri,
      params.textDocument.text,
      params.textDocument.version,
    );
    connection.sendDiagnostics({
      uri: params.textDocument.uri,
      diagnostics: state.getDiagnostics(params.textDocument.uri),
    });
  });

  connection.onDidChangeTextDocument((params) => {
    const existing = state.documents.get(params.textDocument.uri);
    if (!existing) return;

    let doc = existing;
    for (const change of params.contentChanges) {
      if ('range' in change && change.range) {
        doc = TextDocument.update(doc, [change], params.textDocument.version);
      } else {
        doc = TextDocument.create(
          params.textDocument.uri,
          detectLanguage(params.textDocument.uri),
          params.textDocument.version,
          change.text,
        );
      }
    }
    state.documents.set(params.textDocument.uri, doc);
    state.syncDocument(params.textDocument.uri, doc.getText(), params.textDocument.version);
    state.scheduleDiagnostics(params.textDocument.uri, (uri, diagnostics) => {
      connection.sendDiagnostics({ uri, diagnostics });
    });
  });

  connection.onCompletion((params) =>
    state.getCompletions(params.textDocument.uri, params.position.line, params.position.character),
  );

  connection.onHover((params) =>
    state.getHover(params.textDocument.uri, params.position.line, params.position.character),
  );

  connection.onDefinition((params) =>
    state.getDefinition(params.textDocument.uri, params.position.line, params.position.character),
  );

  connection.onReferences((params) =>
    state.getReferences(
      params.textDocument.uri,
      params.position.line,
      params.position.character,
      params.context,
    ),
  );

  connection.onRenameRequest((params) =>
    state.rename(params.textDocument.uri, params.position.line, params.position.character, params.newName),
  );

  connection.onDocumentSymbol((params) => state.getDocumentSymbols(params.textDocument.uri));

  connection.onDocumentFormatting((params) => {
    const edits = state.formatDocument(params.textDocument.uri);
    return edits.length > 0 ? edits : null;
  });

  connection.onRequest('zodyk/getDiagnostics', (params: { uri: string }) =>
    state.getDiagnostics(params.uri),
  );

  connection.listen();
}
