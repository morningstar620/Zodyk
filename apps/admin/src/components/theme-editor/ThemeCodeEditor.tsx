'use client';

import Editor, { loader, type OnMount } from '@monaco-editor/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@zodyk/shared-ui';
import type { Monaco } from '@monaco-editor/react';
import type * as MonacoEditor from 'monaco-editor';
import { buildFileTree, FileExplorer } from './FileExplorer';
import { EditorTabs } from './EditorTabs';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { EditorStatusBar } from './EditorStatusBar';
import { useThemeWorkspace } from './hooks/useThemeWorkspace';
import { useMonacoLsp } from './hooks/useMonacoLsp';
import {
  detectMonacoLanguage,
  pathToModelUri,
  modelUriToPath,
  registerZodykLiquidLanguage,
} from './languages/registerZodykLiquid';
import { registerThemeJsonSchemas } from './languages/jsonSchemas';
import { registerLspMonacoProviders } from './languages/registerLspProviders';
import { invalidateApi, useApi } from '@/hooks/use-api';

interface ThemeCodeEditorProps {
  themeId: string;
}

interface OpenFile {
  path: string;
  content: string;
  dirty: boolean;
  version: number;
}

interface ThemeStorageStatus {
  kind: 'local' | 'r2';
  label: string;
}

export function ThemeCodeEditor({ themeId }: ThemeCodeEditorProps) {
  const searchParams = useSearchParams();
  const initialFile = searchParams.get('file');
  const { data: themeStorage } = useApi<ThemeStorageStatus>('/api/v1/themes/storage');

  const {
    workspace,
    loading,
    error,
    reload,
    ensureFileContent,
    isFileContentLoaded,
    updateFileInWorkspace,
    addFileToWorkspace,
    removeFileFromWorkspace,
  } = useThemeWorkspace(themeId);
  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
  const editorRef = useRef<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef<Map<string, MonacoEditor.editor.ITextModel>>(new Map());
  const lsp = useMonacoLsp();

  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [problemsCollapsed, setProblemsCollapsed] = useState(false);
  const lspProvidersRef = useRef<MonacoEditor.IDisposable[]>([]);
  const initializedRef = useRef(false);
  const contentListenerRef = useRef<MonacoEditor.IDisposable | null>(null);
  const activePathRef = useRef<string | null>(null);
  const versionRef = useRef<Map<string, number>>(new Map());

  const filePaths = useMemo(
    () => (workspace ? Object.keys(workspace.files).sort() : []),
    [workspace],
  );
  const tree = useMemo(() => buildFileTree(filePaths), [filePaths]);
  const activeFile = openFiles.find((f) => f.path === activePath) ?? null;
  const themeName = workspace?.name ?? '';
  const themeStatus = workspace?.status ?? 'draft';

  activePathRef.current = activePath;

  useEffect(() => {
    if (workspace && monacoInstance && !initializedRef.current) {
      initializedRef.current = true;
      registerThemeJsonSchemas(monacoInstance, themeId, workspace);
      void lsp.initClient(workspace);
    }
  }, [workspace, monacoInstance, themeId, lsp]);

  useEffect(() => {
    if (!workspace || !lsp.ready || !initializedRef.current) return;
    if (workspace.healthIssues.length > 0) {
      lsp.updateWorkspace(workspace);
    }
  }, [workspace?.healthIssues, workspace, lsp]);

  useEffect(() => {
    if (!monacoInstance || !lsp.ready) return;
    for (const disposable of lspProvidersRef.current) {
      disposable.dispose();
    }
    lspProvidersRef.current = registerLspMonacoProviders(monacoInstance, lsp.sendRequest);
    return () => {
      for (const disposable of lspProvidersRef.current) {
        disposable.dispose();
      }
      lspProvidersRef.current = [];
    };
  }, [monacoInstance, lsp.ready, lsp.sendRequest]);

  const attachContentListener = useCallback(
    (editor: MonacoEditor.editor.IStandaloneCodeEditor) => {
      contentListenerRef.current?.dispose();
      contentListenerRef.current = editor.onDidChangeModelContent(() => {
        const path = activePathRef.current;
        if (!path) return;
        const content = editor.getValue();
        const version = (versionRef.current.get(path) ?? 1) + 1;
        versionRef.current.set(path, version);
        setOpenFiles((prev) =>
          prev.map((f) => (f.path === path ? { ...f, content, dirty: true, version } : f)),
        );
        if (lsp.ready) {
          lsp.notifyDocumentChange(pathToModelUri(themeId, path), version, content);
        }
      });
    },
    [lsp, themeId],
  );

  const getOrCreateModel = useCallback(
    (monaco: Monaco, path: string, content: string) => {
      const uri = monaco.Uri.parse(pathToModelUri(themeId, path));
      let model = monaco.editor.getModel(uri);
      if (!model) {
        model = monaco.editor.createModel(content, detectMonacoLanguage(path), uri);
        modelsRef.current.set(path, model);
      } else if (model.getValue() !== content) {
        model.setValue(content);
      }
      return model;
    },
    [themeId],
  );

  const openFile = useCallback(
    async (path: string, content?: string) => {
      const existing = openFiles.find((f) => f.path === path);
      if (existing) {
        setActivePath(path);
        if (monacoInstance && editorRef.current) {
          const model = getOrCreateModel(monacoInstance, path, existing.content);
          editorRef.current.setModel(model);
          attachContentListener(editorRef.current);
        }
        return;
      }

      let fileContent = content;
      if (fileContent === undefined) {
        fileContent = isFileContentLoaded(path)
          ? (workspace?.files[path]?.content ?? '')
          : await ensureFileContent(path);
      }

      const version = versionRef.current.get(path) ?? 1;
      versionRef.current.set(path, version);

      setOpenFiles((prev) => {
        if (prev.some((f) => f.path === path)) return prev;
        return [...prev, { path, content: fileContent!, dirty: false, version }];
      });
      setActivePath(path);

      if (monacoInstance && editorRef.current) {
        const model = getOrCreateModel(monacoInstance, path, fileContent!);
        editorRef.current.setModel(model);
        attachContentListener(editorRef.current);
      }

      if (lsp.ready) {
        const uri = pathToModelUri(themeId, path);
        lsp.notifyDocumentOpen(uri, detectMonacoLanguage(path), version, fileContent!);
      }
    },
    [
      themeId,
      openFiles,
      workspace,
      monacoInstance,
      getOrCreateModel,
      lsp,
      ensureFileContent,
      isFileContentLoaded,
      attachContentListener,
    ],
  );

  useEffect(() => {
    if (!workspace || !initialFile || openFiles.length > 0) return;
    const cached = workspace.files[initialFile]?.content;
    void openFile(initialFile, isFileContentLoaded(initialFile) ? cached : undefined);
  }, [workspace, initialFile, openFiles.length, openFile, isFileContentLoaded]);

  const closeFile = useCallback(
    (path: string) => {
      setOpenFiles((prev) => {
        const next = prev.filter((f) => f.path !== path);
        if (activePath === path) {
          const fallback = next[next.length - 1]?.path ?? null;
          setActivePath(fallback);
          if (fallback && monacoInstance && editorRef.current) {
            const file = next.find((f) => f.path === fallback);
            if (file) {
              const model = getOrCreateModel(monacoInstance, fallback, file.content);
              editorRef.current.setModel(model);
              attachContentListener(editorRef.current);
            }
          }
        }
        return next;
      });
    },
    [activePath, monacoInstance, getOrCreateModel, attachContentListener],
  );

  const handleEditorMount: OnMount = (editor, monaco) => {
    setMonacoInstance(monaco);
    editorRef.current = editor;
    registerZodykLiquidLanguage(monaco);

    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 13,
      wordWrap: 'on',
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      formatOnPaste: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      bracketPairColorization: { enabled: true },
    });

    if (activePathRef.current) {
      const file = openFiles.find((f) => f.path === activePathRef.current);
      if (file) {
        const model = getOrCreateModel(monaco, file.path, file.content);
        editor.setModel(model);
        attachContentListener(editor);
      }
    }
  };

  const handleSave = useCallback(async () => {
    if (!activePath || !activeFile || !workspace) return;

    const uri = pathToModelUri(themeId, activePath);
    const errors = lsp.getErrorsForUri(uri);
    if (errors.length > 0) {
      alert(
        `Fix ${errors.length} error(s) before saving.\n\n${errors.map((e) => e.message).join('\n')}`,
      );
      return;
    }

    const content =
      editorRef.current?.getValue() ?? activeFile.content;

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/themes/${themeId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activePath, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save');
      }

      const newVersion = activeFile.version + 1;
      versionRef.current.set(activePath, newVersion);

      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === activePath ? { ...f, content, dirty: false, version: newVersion } : f,
        ),
      );

      const updated = {
        ...workspace,
        files: {
          ...workspace.files,
          [activePath]: {
            ...workspace.files[activePath]!,
            content,
            version: newVersion,
          },
        },
      };
      updateFileInWorkspace(activePath, content);
      lsp.syncWorkspace(updated, activePath, content, newVersion);
      invalidateApi(`/api/v1/themes/${themeId}/language`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [activePath, activeFile, themeId, lsp, workspace, updateFileInWorkspace]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  async function handleDeleteFile() {
    if (!activePath) return;
    if (!confirm(`Delete ${activePath}?`)) return;
    const res = await fetch(
      `/api/v1/themes/${themeId}/files?path=${encodeURIComponent(activePath)}`,
      { method: 'DELETE' },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? 'Failed to delete file');
      return;
    }
    removeFileFromWorkspace(activePath);
    closeFile(activePath);
    invalidateApi(`/api/v1/themes/${themeId}/language`);
  }

  async function handleCreateFile() {
    const path = newFilePath.trim().replace(/^\/+/, '');
    if (!path) return;
    const res = await fetch(`/api/v1/themes/${themeId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content: '' }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? 'Failed to create file');
      return;
    }
    addFileToWorkspace(path, '');
    setNewFileOpen(false);
    setNewFilePath('');
    await openFile(path, '');
    invalidateApi(`/api/v1/themes/${themeId}/language`);
  }

  const jumpToDiagnostic = useCallback(
    (uri: string, line: number) => {
      const path = modelUriToPath(uri);
      if (!path) return;
      void openFile(path).then(() => {
        if (editorRef.current) {
          editorRef.current.setPosition({ lineNumber: line, column: 1 });
          editorRef.current.revealLineInCenter(line);
          editorRef.current.focus();
        }
      });
    },
    [openFile],
  );

  const totalErrors = useMemo(
    () => lsp.diagnostics.filter((d) => d.severity === 'error').length,
    [lsp.diagnostics],
  );
  const totalWarnings = useMemo(
    () => lsp.diagnostics.filter((d) => d.severity === 'warning').length,
    [lsp.diagnostics],
  );

  if (loading && !workspace) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        Loading theme workspace…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-zinc-50 text-sm text-red-600">
        <p>{error}</p>
        <button type="button" className="text-blue-600 underline" onClick={() => void reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-3">
        <div className="flex items-center gap-3">
          <Link href="/themes" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← Themes
          </Link>
          <span className="text-sm font-medium text-zinc-900">{themeName}</span>
          {themeStatus === 'live' && (
            <Badge variant="success">Live — changes apply on save</Badge>
          )}
          {activePath && <span className="text-xs text-zinc-500">{activePath}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/themes/${themeId}/customize`}
            className="rounded px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Customize
          </Link>
          <button
            type="button"
            disabled={!activePath}
            className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
            onClick={handleDeleteFile}
          >
            Delete file
          </button>
          <button
            type="button"
            disabled={!activeFile?.dirty || saving || !activePath}
            className="rounded bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <FileExplorer
            tree={tree}
            selectedPath={activePath}
            onSelect={(path) => void openFile(path)}
            onCreateFile={() => setNewFileOpen(true)}
            newFileOpen={newFileOpen}
            newFilePath={newFilePath}
            onNewFilePathChange={setNewFilePath}
            onCreateFileSubmit={handleCreateFile}
            onCancelCreate={() => setNewFileOpen(false)}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <EditorTabs
              tabs={openFiles.map((f) => ({ path: f.path, dirty: f.dirty }))}
              activePath={activePath}
              onSelect={(path) => {
                setActivePath(path);
                if (monacoInstance && editorRef.current) {
                  const file = openFiles.find((f) => f.path === path);
                  if (file) {
                    const model = getOrCreateModel(monacoInstance, path, file.content);
                    editorRef.current.setModel(model);
                    attachContentListener(editorRef.current);
                  }
                }
              }}
              onClose={closeFile}
            />
            <main className="min-h-0 flex-1">
              {activePath ? (
                <Editor
                  key={activePath}
                  height="100%"
                  path={pathToModelUri(themeId, activePath)}
                  language={detectMonacoLanguage(activePath)}
                  theme="vs-light"
                  defaultValue={activeFile?.content ?? ''}
                  onMount={handleEditorMount}
                  options={{ automaticLayout: true }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  Select a file from the explorer
                </div>
              )}
            </main>
          </div>
        </div>

        <DiagnosticsPanel
          diagnostics={lsp.diagnostics}
          onSelect={jumpToDiagnostic}
          collapsed={problemsCollapsed}
          onToggle={() => setProblemsCollapsed((v) => !v)}
        />

        <EditorStatusBar
          path={activePath}
          language={activePath ? detectMonacoLanguage(activePath) : '—'}
          errorCount={totalErrors}
          warningCount={totalWarnings}
          dirty={Boolean(activeFile?.dirty)}
          saving={saving}
          lspReady={lsp.ready}
          storageLabel={themeStorage?.label}
        />
      </div>
    </div>
  );
}

loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
