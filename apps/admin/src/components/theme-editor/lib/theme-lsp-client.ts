import { ThemeLspWorkerClient, type LspDiagnosticEntry } from '@zodyk/theme-lsp/client';
import type { ThemeWorkspaceSnapshot } from '@zodyk/theme-language';

export type { LspDiagnosticEntry };

/** Web Worker LSP client wrapper for the theme editor. */
export class ThemeLspClient {
  private client: ThemeLspWorkerClient;

  constructor() {
    const worker = new Worker(new URL('./theme-lsp.worker.ts', import.meta.url));
    this.client = new ThemeLspWorkerClient(worker);
  }

  init(workspace: ThemeWorkspaceSnapshot): void {
    void this.client.init(workspace);
  }

  updateWorkspace(workspace: ThemeWorkspaceSnapshot): void {
    void this.client.updateWorkspace(workspace);
  }

  onDiagnostics(handler: (entries: LspDiagnosticEntry[], uri: string) => void): void {
    this.client.onDiagnostics(handler);
  }

  notifyDocumentOpen(uri: string, languageId: string, version: number, text: string): void {
    void this.client.notifyDocumentOpen(uri, languageId, version, text);
  }

  notifyDocumentChange(uri: string, version: number, text: string): void {
    void this.client.notifyDocumentChange(uri, version, text);
  }

  sendRequest<T>(method: string, params?: unknown): Promise<T> {
    switch (method) {
      case 'textDocument/completion': {
        const p = params as {
          textDocument?: { uri: string };
          position?: { line: number; character: number };
        };
        if (!p.textDocument?.uri || !p.position) return Promise.resolve([] as T);
        return this.client.getCompletions(
          p.textDocument.uri,
          p.position.line,
          p.position.character,
        ) as Promise<T>;
      }
      case 'textDocument/hover': {
        const p = params as {
          textDocument?: { uri: string };
          position?: { line: number; character: number };
        };
        if (!p.textDocument?.uri || !p.position) return Promise.resolve(null as T);
        return this.client.getHover(
          p.textDocument.uri,
          p.position.line,
          p.position.character,
        ) as Promise<T>;
      }
      case 'textDocument/definition': {
        const p = params as {
          textDocument?: { uri: string };
          position?: { line: number; character: number };
        };
        if (!p.textDocument?.uri || !p.position) return Promise.resolve(null as T);
        return this.client.getDefinition(
          p.textDocument.uri,
          p.position.line,
          p.position.character,
        ) as Promise<T>;
      }
      case 'zodyk/getDiagnostics': {
        const p = params as { uri?: string };
        if (!p.uri) return Promise.resolve([] as T);
        return this.client.getDiagnostics(p.uri) as Promise<T>;
      }
      default:
        return this.client.sendRequest<T>(method, params);
    }
  }

  getErrorsForUri(uri: string): LspDiagnosticEntry[] {
    void uri;
    return [];
  }

  async getErrorsForUriAsync(uri: string): Promise<LspDiagnosticEntry[]> {
    return this.client.getDiagnostics(uri).then((entries) =>
      entries.filter((e) => e.severity === 'error'),
    );
  }

  dispose(): void {
    this.client.dispose();
  }
}
