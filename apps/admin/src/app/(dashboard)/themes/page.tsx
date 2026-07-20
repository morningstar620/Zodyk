'use client';

import { Badge, Button } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useApi, mutateApi } from '@/hooks/use-api';
import { TableSkeleton } from '@/components/skeletons';

interface ThemeRow {
  id: string;
  name: string;
  slug: string;
  version: string;
  status: 'live' | 'draft' | 'archived';
  isActive: boolean;
  lastSavedAt?: string;
  updatedAt: string;
  storageKind?: 'local' | 'r2';
}

interface HealthIssue {
  code: string;
  message: string;
  severity: string;
  templateKey?: string;
  metaObjectSlug?: string;
}

interface HealthResponse {
  issues: HealthIssue[];
  themeId: string | null;
}

interface StorageHealth {
  configured: boolean;
  connection?: boolean;
  publicUrl?: boolean;
}

interface ThemeStorageStatus {
  kind: 'local' | 'r2';
  label: string;
}

interface ThemeR2SyncStatus {
  themeId: string;
  slug: string;
  name: string;
  storageKind: 'local' | 'r2';
  expectedFiles: number;
  presentInR2: number;
  missingInR2: string[];
  availableLocally: string[];
  needsSync: boolean;
  localSourcePath?: string;
}

export default function ThemesPage() {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [syncingR2, setSyncingR2] = useState(false);
  const { data: themes = [], isLoading: themesLoading } = useApi<ThemeRow[]>('/api/v1/themes');
  const { data: health } = useApi<HealthResponse>('/api/v1/themes/health');
  const { data: themeStorage } = useApi<ThemeStorageStatus>('/api/v1/themes/storage');
  const { data: storageHealth } = useApi<StorageHealth>('/api/v1/storage/health');

  const issues = health?.issues ?? [];
  const activeThemeId = health?.themeId ?? null;
  const isLocalThemeStorage = themeStorage?.kind === 'local';
  const storageReady =
    isLocalThemeStorage || Boolean(storageHealth?.configured && storageHealth?.connection);
  const liveThemeId = themes.find((t) => t.status === 'live' || t.isActive)?.id;
  const { data: r2Sync } = useApi<ThemeR2SyncStatus>(
    liveThemeId && !isLocalThemeStorage ? `/api/v1/themes/${liveThemeId}/r2-sync` : null,
  );

  async function refreshThemes() {
    await mutateApi('/api/v1/themes');
    await mutateApi('/api/v1/themes/health');
    if (liveThemeId && !isLocalThemeStorage) {
      await mutateApi(`/api/v1/themes/${liveThemeId}/r2-sync`);
    }
  }

  async function syncLiveThemeToR2() {
    if (!liveThemeId) return;
    setSyncingR2(true);
    try {
      const res = await fetch(`/api/v1/themes/${liveThemeId}/r2-sync`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to upload theme to R2');
      }
      await refreshThemes();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload theme to R2');
    } finally {
      setSyncingR2(false);
    }
  }

  async function publish(themeId: string) {
    await fetch('/api/v1/themes/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId }),
    });
    await refreshThemes();
  }

  async function duplicate(themeId: string) {
    await fetch('/api/v1/themes/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId }),
    });
    await refreshThemes();
  }

  async function remove(themeId: string) {
    if (!confirm('Delete this theme?')) return;
    const res = await fetch(`/api/v1/themes/${themeId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? 'Failed to delete theme');
      return;
    }
    await refreshThemes();
  }

  async function downloadTheme(themeId: string) {
    window.location.href = `/api/v1/themes/${themeId}/export`;
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace(/\.zip$/i, ''));
      const res = await fetch('/api/v1/themes/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Upload failed');
      }
      await refreshThemes();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  }

  async function scaffold(issue: HealthIssue) {
    if (!activeThemeId || !issue.templateKey || !issue.metaObjectSlug) return;
    const isArchive = issue.code === 'missing_archive_template';
    const templatePath = `templates/${issue.templateKey}.${isArchive ? 'archive' : 'single'}.json`;
    await fetch('/api/v1/themes/scaffold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        themeId: activeThemeId,
        templatePath,
        name: `${issue.metaObjectSlug} ${isArchive ? 'Archive' : 'Single'}`,
        sectionType: isArchive ? 'main-archive' : 'main-single',
      }),
    });
    await refreshThemes();
  }

  const liveTheme = themes.find((t) => t.status === 'live' || t.isActive);
  const draftThemes = themes.filter((t) => t.status === 'draft');

  function formatDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Themes</h1>
          <p className="text-zinc-600">
            Customize your storefront appearance
            {themeStorage ? (
              <>
                {' '}
                · <span className="text-zinc-500">{themeStorage.label}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={uploadRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!storageReady || uploading}
            onClick={() => uploadRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Add theme'}
          </Button>
        </div>
      </div>

      {!storageReady && !isLocalThemeStorage && storageHealth !== undefined && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Object storage (R2) is required for cloud theme storage. Configure R2 in{' '}
          <Link href="/settings/integrations" className="font-medium underline">
            Settings → Integrations
          </Link>
          , or set <code className="rounded bg-amber-100 px-1">THEME_STORAGE=local</code> for
          local development.
        </div>
      )}

      {r2Sync?.needsSync && storageReady && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">
            Live theme files are missing from R2 ({r2Sync.missingInR2.length} of{' '}
            {r2Sync.expectedFiles} files).
          </p>
          <p className="mt-1 text-amber-800">
            The storefront can read bundled theme files from the repo as a fallback, but production
            edits require files in R2. Upload from{' '}
            <code className="rounded bg-amber-100 px-1">{r2Sync.localSourcePath}</code>
            {r2Sync.availableLocally.length === 0
              ? ' — no local files found at that path on this server.'
              : ` (${r2Sync.availableLocally.length} files available locally).`}
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              disabled={syncingR2 || r2Sync.availableLocally.length === 0}
              onClick={() => void syncLiveThemeToR2()}
            >
              {syncingR2 ? 'Uploading to R2…' : 'Upload theme to R2'}
            </Button>
          </div>
        </div>
      )}

      {themesLoading && themes.length === 0 ? (
        <TableSkeleton rows={3} columns={4} />
      ) : (
        <>
          {liveTheme && (
            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="grid gap-4 p-6 md:grid-cols-[1fr_auto]">
                <div className="flex gap-4">
                  <div className="hidden h-32 w-48 shrink-0 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 sm:block" />
                  <div className="hidden h-32 w-20 shrink-0 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 sm:block" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-zinc-900">{liveTheme.name}</h2>
                      <Badge variant="success">Live</Badge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      Version {liveTheme.version} · Last saved{' '}
                      {formatDate(liveTheme.lastSavedAt ?? liveTheme.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadTheme(liveTheme.id)}>
                    Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => duplicate(liveTheme.id)}>
                    Duplicate
                  </Button>
                  <Link
                    href={`/themes/${liveTheme.id}/code`}
                    prefetch
                    className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Edit code
                  </Link>
                  <Link
                    href={`/themes/${liveTheme.id}/customize`}
                    prefetch
                    className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white"
                  >
                    Edit theme
                  </Link>
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Draft themes</h2>
            </div>
            {draftThemes.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No draft themes. Upload a zip or duplicate the live theme to create one.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {draftThemes.map((theme) => (
                  <li
                    key={theme.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 shrink-0 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200" />
                      <div>
                        <p className="font-medium text-zinc-900">{theme.name}</p>
                        <p className="text-sm text-zinc-500">
                          Last saved {formatDate(theme.lastSavedAt ?? theme.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => downloadTheme(theme.id)}>
                        Download
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => publish(theme.id)}>
                        Publish
                      </Button>
                      <Link
                        href={`/themes/${theme.id}/code`}
                        prefetch
                        className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                      >
                        Edit code
                      </Link>
                      <Link
                        href={`/themes/${theme.id}/customize`}
                        prefetch
                        className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white"
                      >
                        Edit theme
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => remove(theme.id)}>
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Theme health</h2>
        {issues.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No issues detected.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {issues.map((issue, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 text-sm"
              >
                <div>
                  <Badge variant={issue.severity === 'error' ? 'destructive' : 'secondary'}>
                    {issue.code}
                  </Badge>
                  <span className="ml-2 text-zinc-700">{issue.message}</span>
                </div>
                {(issue.code === 'missing_archive_template' ||
                  issue.code === 'missing_single_template') && (
                  <Button size="sm" variant="outline" onClick={() => scaffold(issue)}>
                    Scaffold template
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
