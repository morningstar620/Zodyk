import {
  createMessageConnection,
  BrowserMessageReader,
  BrowserMessageWriter,
  PublishDiagnosticsNotification,
  type Diagnostic,
} from 'vscode-languageserver/browser.js';
import type { ThemeWorkspaceSnapshot } from '@zodyk/theme-language';

export interface LspDiagnosticEntry {
  uri: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source?: string;
}

function mapDiagnostics(uri: string, diagnostics: Diagnostic[]): LspDiagnosticEntry[] {
  return diagnostics.map((diag) => ({
    uri,
    line: diag.range.start.line + 1,
    column: diag.range.start.character + 1,
    message: diag.message,
    severity:
      diag.severity === 1 ? 'error' : diag.severity === 2 ? 'warning' : 'info',
    source: diag.source,
  }));
}

/** Web Worker LSP client — offloads language intelligence off the main thread. */
export class ThemeLspWorkerClient {
  private worker: Worker;
  private connection;
  private initPromise: Promise<void>;
  private diagnosticHandler: ((entries: LspDiagnosticEntry[], uri: string) => void) | null =
    null;

  constructor(worker: Worker) {
    this.worker = worker;
    const reader = new BrowserMessageReader(this.worker);
    const writer = new BrowserMessageWriter(this.worker);
    this.connection = createMessageConnection(reader, writer);

    this.connection.onNotification(PublishDiagnosticsNotification.type, (params) => {
      if (!this.diagnosticHandler) return;
      this.diagnosticHandler(mapDiagnostics(params.uri, params.diagnostics), params.uri);
    });

    this.initPromise = new Promise((resolve) => {
      this.connection.listen();
      void this.connection
        .sendRequest('initialize', {
          processId: null,
          capabilities: {},
          rootUri: null,
        })
        .then(() => {
          this.connection.sendNotification('initialized', {});
          resolve();
        });
    });
  }

  async waitUntilReady(): Promise<void> {
    await this.initPromise;
  }

  onDiagnostics(handler: (entries: LspDiagnosticEntry[], uri: string) => void): void {
    this.diagnosticHandler = handler;
  }

  async init(workspace: ThemeWorkspaceSnapshot): Promise<void> {
    await this.waitUntilReady();
    this.connection.sendNotification('zodyk/initWorkspace', workspace);
  }

  async updateWorkspace(workspace: ThemeWorkspaceSnapshot): Promise<void> {
    await this.waitUntilReady();
    this.connection.sendNotification('zodyk/updateWorkspace', workspace);
  }

  async notifyDocumentOpen(
    uri: string,
    languageId: string,
    version: number,
    text: string,
  ): Promise<void> {
    await this.waitUntilReady();
    this.connection.sendNotification('textDocument/didOpen', {
      textDocument: { uri, languageId, version, text },
    });
  }

  async notifyDocumentChange(uri: string, version: number, text: string): Promise<void> {
    await this.waitUntilReady();
    this.connection.sendNotification('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    });
  }

  async sendRequest<T>(method: string, params?: unknown): Promise<T> {
    await this.waitUntilReady();
    return this.connection.sendRequest(method, params) as Promise<T>;
  }

  async getCompletions(uri: string, line: number, character: number) {
    return this.connection.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async getHover(uri: string, line: number, character: number) {
    return this.connection.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async getDefinition(uri: string, line: number, character: number) {
    return this.connection.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async getDiagnostics(uri: string): Promise<LspDiagnosticEntry[]> {
    const diagnostics = await this.sendRequest<Diagnostic[]>('zodyk/getDiagnostics', { uri });
    return mapDiagnostics(uri, diagnostics);
  }

  dispose(): void {
    this.diagnosticHandler = null;
    this.connection.dispose();
    this.worker.terminate();
  }
}
