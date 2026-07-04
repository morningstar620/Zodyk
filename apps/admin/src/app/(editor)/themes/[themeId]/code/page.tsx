'use client';

import Editor from '@monaco-editor/react';
import Link from 'next/link';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@zodyk/shared-ui';

interface ThemeFile {
  path: string;
  content: string;
}

function buildTree(paths: string[]) {
  const root: Record<string, unknown> = {};
  for (const path of paths) {
    const parts = path.split('/');
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      if (i === parts.length - 1) {
        (node as Record<string, string>)[part] = path;
      } else {
        if (!node[part]) node[part] = {};
        node = node[part] as Record<string, unknown>;
      }
    }
  }
  return root;
}

function TreeNode({
  name,
  node,
  selectedPath,
  onSelect,
  prefix = '',
}: {
  name: string;
  node: unknown;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  prefix?: string;
}) {
  const fullName = prefix ? `${prefix}/${name}` : name;

  if (typeof node === 'string') {
    return (
      <button
        type="button"
        className={`block w-full truncate px-2 py-1 text-left text-sm ${
          selectedPath === node ? 'bg-blue-50 text-blue-700' : 'text-zinc-700 hover:bg-zinc-100'
        }`}
        onClick={() => onSelect(node)}
      >
        {name}
      </button>
    );
  }

  const children = node as Record<string, unknown>;
  return (
    <details open className="pl-2">
      <summary className="cursor-pointer py-1 text-sm font-medium text-zinc-600">{name}</summary>
      {Object.entries(children).map(([childName, childNode]) => (
        <TreeNode
          key={childName}
          name={childName}
          node={childNode}
          selectedPath={selectedPath}
          onSelect={onSelect}
          prefix={fullName}
        />
      ))}
    </details>
  );
}

export default function ThemeCodeEditorPage({
  params,
}: {
  params: Promise<{ themeId: string }>;
}) {
  const { themeId } = use(params);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [themeName, setThemeName] = useState('');
  const [themeStatus, setThemeStatus] = useState<'live' | 'draft' | 'archived'>('draft');
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');

  const loadFile = useCallback(
    async (path: string) => {
      const res = await fetch(`/api/v1/themes/${themeId}/files?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      setSelectedPath(path);
      setContent(data.content ?? '');
      setDirty(false);
    },
    [themeId],
  );

  useEffect(() => {
    fetch(`/api/v1/themes/${themeId}`)
      .then((r) => r.json())
      .then((meta) => {
        setThemeName(meta.name);
        setThemeStatus(meta.status ?? 'draft');
        setFiles(meta.files ?? []);
      });
  }, [themeId]);

  const tree = useMemo(() => buildTree(files), [files]);

  const language = selectedPath?.endsWith('.json')
    ? 'json'
    : selectedPath?.endsWith('.css')
      ? 'css'
      : selectedPath?.endsWith('.js')
        ? 'javascript'
        : 'html';

  async function handleDeleteFile() {
    if (!selectedPath) return;
    if (!confirm(`Delete ${selectedPath}?`)) return;
    const res = await fetch(
      `/api/v1/themes/${themeId}/files?path=${encodeURIComponent(selectedPath)}`,
      { method: 'DELETE' },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? 'Failed to delete file');
      return;
    }
    setFiles((prev) => prev.filter((f) => f !== selectedPath));
    setSelectedPath(null);
    setContent('');
    setDirty(false);
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
    setFiles((prev) => [...prev, path].sort());
    setNewFileOpen(false);
    setNewFilePath('');
    await loadFile(path);
  }

  async function handleSave() {
    if (!selectedPath) return;
    setSaving(true);
    try {
      await fetch(`/api/v1/themes/${themeId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedPath, content }),
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

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
          {selectedPath && (
            <span className="text-xs text-zinc-500">{selectedPath}</span>
          )}
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
            disabled={!selectedPath}
            className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
            onClick={handleDeleteFile}
          >
            Delete file
          </button>
          <button
            type="button"
            disabled={!dirty || saving || !selectedPath}
            className="rounded bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-2">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-xs font-semibold uppercase text-zinc-500">Explorer</p>
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setNewFileOpen(true)}
            >
              + New
            </button>
          </div>
          {newFileOpen && (
            <div className="mb-2 space-y-1 rounded border border-zinc-200 p-2">
              <input
                className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
                placeholder="sections/foo.liquid"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-white"
                  onClick={handleCreateFile}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="rounded px-2 py-0.5 text-xs text-zinc-600"
                  onClick={() => setNewFileOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {Object.entries(tree).map(([name, node]) => (
            <TreeNode
              key={name}
              name={name}
              node={node}
              selectedPath={selectedPath}
              onSelect={loadFile}
            />
          ))}
        </aside>
        <main className="min-w-0 flex-1">
          {selectedPath ? (
            <Editor
              height="100%"
              language={language}
              value={content}
              theme="vs-light"
              options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
              onChange={(value) => {
                setContent(value ?? '');
                setDirty(true);
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Select a file from the explorer
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
