'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import type {
  ThemeFile,
  ThemeWorkspaceMetadata,
  ThemeWorkspaceSnapshot,
} from '@zodyk/theme-language';
import { apiFetcher } from '@/lib/api-fetcher';
import { invalidateApi } from '@/hooks/use-api';

function getLspPrefetchPaths(paths: string[]): string[] {
  return paths.filter(
    (p) =>
      p.endsWith('.liquid') ||
      (p.startsWith('templates/') && p.endsWith('.json')) ||
      p.startsWith('config/'),
  );
}

function metadataToSnapshot(
  metadata: ThemeWorkspaceMetadata,
  files: Record<string, ThemeFile> = {},
): ThemeWorkspaceSnapshot {
  const snapshotFiles: Record<string, ThemeFile> = {};
  for (const [path, meta] of Object.entries(metadata.files)) {
    snapshotFiles[path] = files[path] ?? { ...meta, content: '' };
  }
  return { ...metadata, files: snapshotFiles };
}

async function fetchWorkspaceFiles(
  themeId: string,
  paths: string[],
): Promise<Record<string, ThemeFile>> {
  const res = await fetch(`/api/v1/themes/${themeId}/language/workspace/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Failed to load file contents');
  }
  const data = (await res.json()) as { files: Record<string, ThemeFile> };
  return data.files;
}

export function useThemeWorkspace(themeId: string) {
  const workspaceKey = `/api/v1/themes/${themeId}/language/workspace`;
  const healthKey = `/api/v1/themes/${themeId}/language/health`;

  const {
    data: metadata,
    error: metadataError,
    isLoading: metadataLoading,
    mutate: mutateWorkspace,
  } = useSWR<ThemeWorkspaceMetadata>(workspaceKey, apiFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  const { data: healthData } = useSWR<{ healthIssues: ThemeWorkspaceMetadata['healthIssues'] }>(
    metadata ? healthKey : null,
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  const [loadedFiles, setLoadedFiles] = useState<Record<string, ThemeFile>>({});
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

  const prefetchFiles = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return;
      setFilesLoading(true);
      setFilesError(null);
      try {
        const files = await fetchWorkspaceFiles(themeId, paths);
        setLoadedFiles((prev) => ({ ...prev, ...files }));
      } catch (err) {
        setFilesError(err instanceof Error ? err.message : 'Failed to load files');
      } finally {
        setFilesLoading(false);
      }
    },
    [themeId],
  );

  useEffect(() => {
    if (!metadata) return;
    const prefetchPaths = getLspPrefetchPaths(Object.keys(metadata.files));
    void prefetchFiles(prefetchPaths);
  }, [metadata, prefetchFiles]);

  const workspace = useMemo(() => {
    if (!metadata) return null;
    const merged = metadataToSnapshot(metadata, loadedFiles);
    if (healthData?.healthIssues) {
      merged.healthIssues = healthData.healthIssues;
    }
    return merged;
  }, [metadata, loadedFiles, healthData]);

  const reload = useCallback(async () => {
    setLoadedFiles({});
    await mutateWorkspace();
    await invalidateApi(`/api/v1/themes/${themeId}/language`);
  }, [mutateWorkspace, themeId]);

  const ensureFileContent = useCallback(
    async (path: string): Promise<string> => {
      if (loadedFiles[path]) return loadedFiles[path]!.content;
      const files = await fetchWorkspaceFiles(themeId, [path]);
      setLoadedFiles((prev) => ({ ...prev, ...files }));
      return files[path]?.content ?? '';
    },
    [themeId, loadedFiles],
  );

  const isFileContentLoaded = useCallback(
    (path: string) => Boolean(loadedFiles[path]),
    [loadedFiles],
  );

  const updateFileInWorkspace = useCallback((path: string, content: string) => {
    setLoadedFiles((prev) => {
      const existing = prev[path] ?? workspace?.files[path];
      return {
        ...prev,
        [path]: {
          path,
          content,
          version: (existing?.version ?? 0) + 1,
          languageId: existing?.languageId ?? 'plaintext',
        },
      };
    });
  }, [workspace]);

  const addFileToWorkspace = useCallback((path: string, content = '') => {
    setLoadedFiles((prev) => ({
      ...prev,
      [path]: {
        path,
        content,
        version: 1,
        languageId: path.endsWith('.liquid') ? 'zodyk-liquid' : 'plaintext',
      },
    }));
  }, []);

  const removeFileFromWorkspace = useCallback((path: string) => {
    setLoadedFiles((prev) => {
      const { [path]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  return {
    workspace,
    loading: metadataLoading || filesLoading,
    error: metadataError?.message ?? filesError,
    reload,
    ensureFileContent,
    isFileContentLoaded,
    updateFileInWorkspace,
    addFileToWorkspace,
    removeFileFromWorkspace,
  };
}

export type ThemeWorkspaceHook = ReturnType<typeof useThemeWorkspace>;
