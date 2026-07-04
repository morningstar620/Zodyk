'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@zodyk/shared-ui';
import { CustomizerLayout } from './components/layout/CustomizerLayout';
import { SyncProgressBar } from './components/layout/SyncProgressBar';
import { TopToolbar } from './components/layout/TopToolbar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCustomizerStore, type PageOption } from './store';

interface ThemeCustomizerProps {
  themeId: string;
  websiteUrl?: string;
  themeName?: string;
}

export function ThemeCustomizer({ themeId, websiteUrl, themeName }: ThemeCustomizerProps) {
  const [pages, setPages] = useState<PageOption[]>([]);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [schemasReady, setSchemasReady] = useState(false);
  const [themeStatus, setThemeStatus] = useState<'live' | 'draft' | 'archived'>('draft');
  const [publishing, setPublishing] = useState(false);
  const [saveSucceeded, setSaveSucceeded] = useState(false);

  const {
    setThemeMeta,
    setSchemas,
    setPage,
    setPageOptions,
    setTemplateJson,
    setDirty,
    pushHistory,
    setSaving,
    templateJson,
    themeSettings,
    dirty,
    initEditorMeta,
    setSyncState,
  } = useCustomizerStore();

  useEffect(() => {
    async function load() {
      setBootstrapLoading(true);
      setSchemasReady(false);
      try {
        const res = await fetch(
          `/api/v1/themes/${themeId}/customizer-bootstrap?pathname=${encodeURIComponent('/')}`,
        );
        if (!res.ok) throw new Error('Failed to load customizer');
        const data = await res.json();

        setThemeMeta({
          themeId,
          themeName: themeName ?? data.theme?.name ?? 'Theme',
          previewToken: data.theme?.previewToken ?? '',
          websiteUrl: websiteUrl ?? process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'http://localhost:3001',
        });
        initEditorMeta(themeId);
        setThemeStatus(data.theme?.status ?? 'draft');
        setPages(data.pages ?? []);
        setPageOptions(data.pages ?? []);

        const homePage =
          (data.pages as PageOption[] | undefined)?.find(
            (p) => p.templatePath === 'templates/index.json',
          ) ??
          data.page ??
          (data.pages as PageOption[] | undefined)?.[0] ??
          null;

        if (homePage) setPage(homePage);

        if (data.template && typeof data.template === 'object' && 'sections' in data.template) {
          setTemplateJson(data.template);
          setDirty(false);
        } else if (homePage) {
          const path = homePage.templatePath.replace(/^templates\//, '');
          const templateRes = await fetch(`/api/v1/themes/${themeId}/templates/${path}`);
          if (templateRes.ok) {
            const template = await templateRes.json();
            setTemplateJson(template);
            setDirty(false);
          }
        }

        setSchemas({
          sectionSchemas: data.sectionSchemas ?? {},
          sectionTypeList: data.sectionTypes ?? [],
          settingsSchema: data.settingsSchema ?? [],
          themeSettings: data.settings ?? {},
        });
        setSchemasReady(true);
        useCustomizerStore.getState().refreshPreview();
      } catch {
        setSyncState('error');
      } finally {
        setBootstrapLoading(false);
      }
    }

    load();
  }, [
    themeId,
    websiteUrl,
    themeName,
    setThemeMeta,
    setSchemas,
    setPage,
    setPageOptions,
    setTemplateJson,
    setDirty,
    initEditorMeta,
    setSyncState,
  ]);

  async function handlePageSelect(p: PageOption) {
    if (dirty && !confirm('You have unsaved changes. Switch page anyway?')) return;
    const path = p.templatePath.replace(/^templates\//, '');
    const res = await fetch(`/api/v1/themes/${themeId}/templates/${path}`);
    const template = await res.json();
    setPage(p);
    setTemplateJson(template);
    setDirty(false);
    useCustomizerStore.getState().refreshPreview();
  }

  async function handlePublish() {
    setPublishing(true);
    setSyncState('syncing');
    try {
      const res = await fetch('/api/v1/themes/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      });
      if (!res.ok) {
        setSyncState('error');
        return;
      }
      setThemeStatus('live');
      setSyncState('saved');
      window.setTimeout(() => setSyncState('idle'), 1200);
    } catch {
      setSyncState('error');
    } finally {
      setPublishing(false);
    }
  }

  async function handleSave() {
    const page = useCustomizerStore.getState().page;
    if (!page) return;
    setSaving(true);
    setSaveSucceeded(false);
    pushHistory();
    const path = page.templatePath.replace(/^templates\//, '');
    try {
      setSyncState('syncing', 0);
      const templateRes = await fetch(`/api/v1/themes/${themeId}/templates/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateJson),
      });
      if (!templateRes.ok) {
        setSyncState('error');
        return;
      }
      setSyncState('syncing', 50);

      const settingsRes = await fetch(`/api/v1/themes/${themeId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(themeSettings),
      });
      if (!settingsRes.ok) {
        setSyncState('error');
        return;
      }

      setDirty(false);
      setSaveSucceeded(true);
      setSyncState('saved', 100);
      window.setTimeout(() => {
        setSyncState('idle');
        setSaveSucceeded(false);
      }, 1200);
    } catch {
      setSyncState('error');
    } finally {
      setSaving(false);
    }
  }

  useKeyboardShortcuts({ onSave: handleSave });

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      {bootstrapLoading ? (
        <div className="flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
      ) : (
        <TopToolbar
          themeStatus={themeStatus}
          pages={pages}
          onPageSelect={handlePageSelect}
          onSave={handleSave}
          onPublish={handlePublish}
          publishing={publishing}
          saveSucceeded={saveSucceeded}
        />
      )}
      <SyncProgressBar />
      <CustomizerLayout schemasReady={schemasReady} bootstrapLoading={bootstrapLoading} />
    </div>
  );
}
