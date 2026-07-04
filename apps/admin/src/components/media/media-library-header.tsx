'use client';

import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import type { MediaStorageStats } from '@zodyk/core';
import { Button } from '@zodyk/shared-ui';
import { FolderPlus, Upload } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

type MediaLibraryHeaderProps = {
  stats: MediaStorageStats | null;
  onUploadClick: () => void;
  onNewFolder: () => void;
  embedded?: boolean;
};

export function MediaLibraryHeader({
  stats,
  onUploadClick,
  onNewFolder,
  embedded,
}: MediaLibraryHeaderProps) {
  if (embedded) return null;

  const usedLabel = stats ? formatBytes(stats.totalBytes) : '—';
  const quotaLabel = stats ? formatBytes(stats.quotaBytes) : '100 GB';

  return (
    <div className="space-y-4">
      <PageBreadcrumbs
        items={[{ label: 'Content', href: '/' }, { label: 'Media Library' }]}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Media library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All assets stored on Cloudflare R2. {usedLabel} of {quotaLabel} used.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" onClick={onNewFolder}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New folder
          </Button>
          <Button type="button" onClick={onUploadClick}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
