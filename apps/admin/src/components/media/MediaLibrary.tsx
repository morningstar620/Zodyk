'use client';

import type { MediaAsset } from '@zodyk/core';
import { Alert, Button, Input } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { MediaLibrarySkeleton } from '@/components/skeletons';
import { FolderTree } from './FolderTree';
import { MediaDetailPanel } from './MediaDetailPanel';
import { MediaGrid } from './MediaGrid';
import { MediaGridSkeleton } from '@/components/skeletons';
import { MediaUploadZone } from './MediaUploadZone';

interface MediaLibraryProps {
  embedded?: boolean;
  selectionMode?: 'single' | 'multiple' | 'none';
  accept?: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function MediaLibrary({
  embedded = false,
  selectionMode = 'none',
  accept,
  selectedIds: controlledSelected,
  onSelectionChange,
}: MediaLibraryProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [folders, setFolders] = useState<string[]>(['/']);
  const [folder, setFolder] = useState('/');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(controlledSelected ?? []);
  const [detail, setDetail] = useState<MediaAsset | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    const res = await fetch('/api/v1/media/config');
    const data = await res.json();
    setConfigured(Boolean(data.configured));
  }, []);

  const loadFolders = useCallback(async () => {
    const res = await fetch('/api/v1/media/folders');
    const data = await res.json();
    setFolders(data.folders ?? ['/']);
  }, []);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ folder, limit: '48' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/v1/media?${params}`);
      const data = await res.json();
      let list = (data.data ?? []) as MediaAsset[];
      if (accept?.startsWith('image/')) {
        list = list.filter((item) => item.mimeType.startsWith('image/'));
      }
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [folder, search, accept]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (configured) {
      void loadFolders();
      void loadMedia();
    }
  }, [configured, loadFolders, loadMedia]);

  useEffect(() => {
    if (controlledSelected) {
      setSelectedIds(controlledSelected);
    }
  }, [controlledSelected]);

  const toggleSelect = (id: string) => {
    let next: string[];
    if (selectionMode === 'single') {
      next = selectedIds.includes(id) ? [] : [id];
    } else if (selectionMode === 'multiple') {
      next = selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id];
    } else {
      next = selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id];
    }
    setSelectedIds(next);
    onSelectionChange?.(next);
  };

  const bulkDelete = async () => {
    if (!selectedIds.length || !confirm(`Delete ${selectedIds.length} item(s)?`)) return;
    await fetch('/api/v1/media/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds }),
    });
    setSelectedIds([]);
    onSelectionChange?.([]);
    void loadMedia();
    void loadFolders();
  };

  if (configured === null) {
    return <MediaLibrarySkeleton />;
  }

  if (!configured) {
    return (
      <Alert>
        <div className="space-y-3">
          <p>Cloudflare R2 is not configured. Set up media storage to upload and manage files.</p>
          <Link href="/settings/integrations">
            <Button type="button">Configure R2 storage</Button>
          </Link>
        </div>
      </Alert>
    );
  }

  return (
    <div className={embedded ? 'space-y-4' : 'flex flex-col gap-6'}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Media</h1>
          <p className="text-zinc-600">Upload, organize, and manage your media library</p>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-48">
          <FolderTree folders={folders} selected={folder} onSelect={setFolder} />
        </aside>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search media…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            {selectionMode === 'none' && selectedIds.length > 0 && (
              <Button type="button" variant="outline" onClick={() => void bulkDelete()}>
                Delete selected ({selectedIds.length})
              </Button>
            )}
            {selectionMode !== 'none' && selectedIds.length > 0 && (
              <span className="text-sm text-zinc-600">{selectedIds.length} selected</span>
            )}
          </div>

          <MediaUploadZone
            folder={folder}
            onUploaded={() => {
              void loadMedia();
              void loadFolders();
            }}
          />

          {loading ? (
            <MediaGridSkeleton />
          ) : (
            <MediaGrid
              items={items}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onOpen={(item) => {
                if (selectionMode !== 'none') {
                  toggleSelect(item.id);
                } else {
                  setDetail(item);
                }
              }}
              selectionMode={selectionMode !== 'none'}
            />
          )}
        </div>
      </div>

      {detail && (
        <MediaDetailPanel
          item={detail}
          onClose={() => setDetail(null)}
          onUpdated={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setDetail(updated);
          }}
          onDeleted={(id) => {
            setItems((prev) => prev.filter((i) => i.id !== id));
            setDetail(null);
          }}
        />
      )}
    </div>
  );
}
