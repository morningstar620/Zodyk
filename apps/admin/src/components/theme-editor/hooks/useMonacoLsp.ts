'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ThemeWorkspaceSnapshot } from '@zodyk/theme-language';
import { ThemeLspClient, type LspDiagnosticEntry } from '../lib/theme-lsp-client';

export type DiagnosticEntry = LspDiagnosticEntry;

export function useMonacoLsp() {
  const clientRef = useRef<ThemeLspClient | null>(null);
  const [ready, setReady] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEntry[]>([]);

  const initClient = useCallback(async (workspace: ThemeWorkspaceSnapshot) => {
    if (clientRef.current) return;

    const client = new ThemeLspClient();
    client.onDiagnostics((entries, uri) => {
      setDiagnostics((prev) => [...prev.filter((d) => d.uri !== uri), ...entries]);
    });
    client.init(workspace);
    clientRef.current = client;
    setReady(true);
  }, []);

  const syncWorkspace = useCallback(
    (workspace: ThemeWorkspaceSnapshot, savedPath: string, content: string, version: number) => {
      clientRef.current?.updateWorkspace(workspace);
      const uri = `zodyk://theme/${workspace.themeId}/${savedPath}`;
      clientRef.current?.notifyDocumentChange(uri, version, content);
    },
    [],
  );

  const updateWorkspace = useCallback((workspace: ThemeWorkspaceSnapshot) => {
    clientRef.current?.updateWorkspace(workspace);
  }, []);

  const requestDiagnostics = useCallback(async (uri: string) => {
    return clientRef.current?.sendRequest<
      Array<{
        message: string;
        severity?: number;
        range: { start: { line: number; character: number } };
      }>
    >('zodyk/getDiagnostics', { uri }) ?? [];
  }, []);

  const getErrorsForUri = useCallback(
    (uri: string) => diagnostics.filter((d) => d.uri === uri && d.severity === 'error'),
    [diagnostics],
  );

  const getErrorsForUriAsync = useCallback(async (uri: string) => {
    return clientRef.current?.getErrorsForUriAsync(uri) ?? [];
  }, []);

  const notifyDocumentOpen = useCallback((uri: string, languageId: string, version: number, text: string) => {
    clientRef.current?.notifyDocumentOpen(uri, languageId, version, text);
  }, []);

  const notifyDocumentChange = useCallback((uri: string, version: number, text: string) => {
    clientRef.current?.notifyDocumentChange(uri, version, text);
  }, []);

  const sendRequest = useCallback(<T,>(method: string, params?: unknown) => {
    if (!clientRef.current) return Promise.reject(new Error('LSP not connected'));
    return clientRef.current.sendRequest<T>(method, params);
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  return {
    ready,
    diagnostics,
    initClient,
    syncWorkspace,
    updateWorkspace,
    requestDiagnostics,
    getErrorsForUri,
    getErrorsForUriAsync,
    notifyDocumentOpen,
    notifyDocumentChange,
    sendRequest,
    client: clientRef,
  };
}
