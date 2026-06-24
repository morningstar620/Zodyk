'use client';

import { useEffect, useState } from 'react';
import { PreviewFrame } from './PreviewFrame';
import { SectionTree } from './SectionTree';
import { SettingsPanel } from './SettingsPanel';
import { type PageOption, useCustomizerStore } from './store';

interface ThemeCustomizerProps {
  themeId: string;
  websiteUrl?: string;
}

export function ThemeCustomizer({ themeId, websiteUrl }: ThemeCustomizerProps) {
  const [pages, setPages] = useState<PageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagePickerOpen, setPagePickerOpen] = useState(false);

  const {
    previewToken,
    mode,
    device,
    page,
    dirty,
    saving,
    setThemeMeta,
    setSchemas,
    setPage,
    setPageOptions,
    setTemplateJson,
    setMode,
    setDevice,
    undo,
    redo,
    setSaving,
    setDirty,
    pushHistory,
    templateJson,
    themeSettings,
  } = useCustomizerStore();

  useEffect(() => {
    async function load() {
      const [metaRes, schemasRes, pagesRes] = await Promise.all([
        fetch(`/api/v1/themes/${themeId}`),
        fetch(`/api/v1/themes/${themeId}/schemas`),
        fetch('/api/v1/themes/pages'),
      ]);
      const meta = await metaRes.json();
      const schemas = await schemasRes.json();
      const pagesData = await pagesRes.json();

      setThemeMeta({
        themeId,
        previewToken: meta.previewToken,
        websiteUrl: websiteUrl ?? process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'http://localhost:3001',
      });
      setSchemas({
        sectionSchemas: schemas.sectionSchemas,
        settingsSchema: schemas.settingsSchema,
        themeSettings: schemas.settings,
      });
      setPages(pagesData.items ?? []);
      setPageOptions(pagesData.items ?? []);
      const firstPage = pagesData.items?.[0];
      if (firstPage) {
        await loadTemplate(firstPage);
      }
      setLoading(false);
    }

    async function loadTemplate(p: PageOption) {
      const path = p.templatePath.replace(/^templates\//, '');
      const res = await fetch(`/api/v1/themes/${themeId}/templates/${path}`);
      const template = await res.json();
      setPage(p);
      setTemplateJson(template);
      setDirty(false);
    }

    load();
  }, [themeId, websiteUrl, setThemeMeta, setSchemas, setPage, setPageOptions, setTemplateJson, setDirty]);

  async function handlePageSelect(p: PageOption) {
    if (dirty && !confirm('You have unsaved changes. Switch page anyway?')) return;
    const path = p.templatePath.replace(/^templates\//, '');
    const res = await fetch(`/api/v1/themes/${themeId}/templates/${path}`);
    const template = await res.json();
    setPage(p);
    setTemplateJson(template);
    setDirty(false);
    setPagePickerOpen(false);
  }

  async function handleSave() {
    if (!page) return;
    setSaving(true);
    pushHistory();
    const path = page.templatePath.replace(/^templates\//, '');
    try {
      await fetch(`/api/v1/themes/${themeId}/templates/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateJson),
      });
      await fetch(`/api/v1/themes/${themeId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(themeSettings),
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-zinc-600">Loading customizer…</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-3">
        <div className="flex items-center gap-2">
          <a href="/themes" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← Themes
          </a>
          <div className="ml-2 flex rounded-md border border-zinc-200 p-0.5">
            <button
              type="button"
              className={`rounded px-3 py-1 text-xs font-medium ${mode === 'sections' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}
              onClick={() => setMode('sections')}
            >
              Sections
            </button>
            <button
              type="button"
              className={`rounded px-3 py-1 text-xs font-medium ${mode === 'theme_settings' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}
              onClick={() => setMode('theme_settings')}
            >
              Theme settings
            </button>
          </div>
          <div className="relative ml-2">
            <button
              type="button"
              className="rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700"
              onClick={() => setPagePickerOpen((v) => !v)}
            >
              {page?.label ?? 'Select page'} ▾
            </button>
            {pagePickerOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-64 overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-lg">
                {pages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                    onClick={() => handlePageSelect(p)}
                  >
                    <span className="text-zinc-400">{p.group}</span>
                    <br />
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded p-1.5 text-sm ${device === 'desktop' ? 'bg-zinc-200' : ''}`}
            onClick={() => setDevice('desktop')}
            title="Desktop"
          >
            💻
          </button>
          <button
            type="button"
            className={`rounded p-1.5 text-sm ${device === 'mobile' ? 'bg-zinc-200' : ''}`}
            onClick={() => setDevice('mobile')}
            title="Mobile"
          >
            📱
          </button>
          <button type="button" className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100" onClick={undo}>
            ↩
          </button>
          <button type="button" className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100" onClick={redo}>
            ↪
          </button>
          <a
            href={`/themes/${themeId}/code`}
            className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Edit code
          </a>
          <button
            type="button"
            disabled={saving || !dirty}
            className="rounded bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white">
          <SectionTree />
        </aside>
        <main className="min-w-0 flex-1">
          <PreviewFrame />
        </main>
        <aside className="w-80 shrink-0 border-l border-zinc-200 bg-white">
          <SettingsPanel />
        </aside>
      </div>
    </div>
  );
}
