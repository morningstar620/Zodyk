'use client';

import type { MediaAsset, MediaStorageStats } from '@zodyk/core';
import { MEDIA_TRASH_FOLDER } from '@zodyk/core';
import { Alert, Button } from '@zodyk/shared-ui';
import { useFeedback } from '@zodyk/shared-ui/feedback';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MediaLibrarySkeleton, MediaGridSkeleton, TableSkeleton } from '@/components/skeletons';
import { MediaDetailPanel } from './MediaDetailPanel';
import { MediaUploadZone } from './MediaUploadZone';
import { MediaLibraryHeader } from './media-library-header';
import { MediaFoldersSidebar, type MediaFolder } from './media-folders-sidebar';
import { MediaStorageCard } from './media-storage-card';
import { MediaToolbar, type MediaTypeFilter, type MediaViewMode } from './media-toolbar';
import { MediaCard } from './media-card';
import { MediaListView } from './media-list-view';
import { MediaBulkBar } from './media-bulk-bar';
import { MediaPagination } from './media-pagination';

interface MediaLibraryProps {
  embedded?: boolean;
  selectionMode?: 'single' | 'multiple' | 'none';
  accept?: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

const VIEW_STORAGE_KEY = 'zodyk-media-view';
const PAGE_SIZE = 24;

function readStoredView(): MediaViewMode {
  if (typeof window === 'undefined') return 'grid';
  const stored = localStorage.getItem(VIEW_STORAGE_KEY);
  return stored === 'list' ? 'list' : 'grid';
}

export function MediaLibrary({
  embedded = false,
  selectionMode = 'none',
  accept,
  selectedIds: controlledSelected,
  onSelectionChange,
}: MediaLibraryProps) {
  const router = useRouter();
  const toast = useFeedback();
  const uploadRef = useRef<HTMLInputElement>(null);

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [folders, setFolders] = useState<MediaFolder[]>([{ folder: '/', count: 0 }]);
  const [stats, setStats] = useState<MediaStorageStats | null>(null);
  const [folder, setFolder] = useState('/');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>('all');
  const [view, setView] = useState<MediaViewMode>('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(controlledSelected ?? []);
  const [detail, setDetail] = useState<MediaAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulkBusy, setBulkBusy] = useState(false);

  const isTrash = folder === MEDIA_TRASH_FOLDER;
  const showSelection = selectionMode !== 'none' || !embedded;
  const pageIds = items.map((item) => item.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const trashCount = folders.find((f) => f.folder === MEDIA_TRASH_FOLDER)?.count ?? 0;

  useEffect(() => {
    setView(readStoredView());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [folder, debouncedSearch, typeFilter]);

  const handleViewChange = (next: MediaViewMode) => {
    setView(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/media/config');
      if (!res.ok) return;
      const data = await res.json();
      setConfigured(Boolean(data.configured));
    } catch {
      setConfigured(false);
    }
  }, []);

  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/media/folders');
      if (!res.ok) return;
      const data = await res.json();
      setFolders(data.folders ?? [{ folder: '/', count: 0 }]);
    } catch {
      // Keep existing folder list on transient network errors.
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/media/stats');
      if (!res.ok) return;
      setStats((await res.json()) as MediaStorageStats);
    } catch {
      // Stats are non-critical.
    }
  }, []);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        folder,
        limit: String(PAGE_SIZE),
        page: String(page),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (typeFilter === 'image') params.set('mimeType', 'image/');
      else if (typeFilter === 'video') params.set('mimeType', 'video/');
      else if (typeFilter === 'document') params.set('mimeType', 'application/');

      const res = await fetch(`/api/v1/media?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      let list = (data.data ?? []) as MediaAsset[];
      if (accept?.startsWith('image/')) {
        list = list.filter((item) => item.mimeType.startsWith('image/'));
      }
      setItems(list);
      setTotalPages(Math.max(1, data.pagination?.totalPages ?? 1));
      setTotal(data.pagination?.total ?? list.length);
    } catch {
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [folder, debouncedSearch, typeFilter, page, accept, toast]);

  const refresh = useCallback(() => {
    void loadMedia();
    void loadFolders();
    void loadStats();
  }, [loadMedia, loadFolders, loadStats]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (configured) {
      void loadFolders();
      void loadStats();
    }
  }, [configured, loadFolders, loadStats]);

  useEffect(() => {
    if (configured) {
      void loadMedia();
    }
  }, [configured, loadMedia]);

  useEffect(() => {
    if (controlledSelected) {
      setSelectedIds(controlledSelected);
    }
  }, [controlledSelected]);

  const updateSelection = (next: string[]) => {
    setSelectedIds(next);
    onSelectionChange?.(next);
  };

  const toggleSelect = (id: string) => {
    let next: string[];
    if (selectionMode === 'single') {
      next = selectedIds.includes(id) ? [] : [id];
    } else {
      next = selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id];
    }
    updateSelection(next);
  };

  const toggleSelectAll = () => {
    if (allPageSelected) {
      updateSelection(selectedIds.filter((id) => !pageIds.includes(id)));
      return;
    }
    updateSelection([...new Set([...selectedIds, ...pageIds])]);
  };

  const handleOpen = (item: MediaAsset) => {
    if (isTrash) {
      setDetail(item);
      return;
    }
    if (selectionMode !== 'none') {
      toggleSelect(item.id);
      return;
    }
    const isEditableImage =
      item.mimeType.startsWith('image/') && !item.mimeType.includes('svg');
    if (isEditableImage) {
      const href = `/media/${item.id}/edit`;
      router.prefetch(href);
      router.push(href);
    } else {
      setDetail(item);
    }
  };

  const handleEdit = (item: MediaAsset) => {
    const href = `/media/${item.id}/edit`;
    router.prefetch(href);
    router.push(href);
  };

  const handleCopyUrl = async (item: MediaAsset) => {
    try {
      await navigator.clipboard.writeText(item.url);
      toast.success('URL copied to clipboard');
    } catch {
      toast.error('Could not copy URL');
    }
  };

  const handleDownload = (item: MediaAsset) => {
    window.open(item.url, '_blank');
    toast.success(`Downloading ${item.originalFilename}`);
  };

  const trashItems = async (ids: string[]) => {
    const res = await fetch('/api/v1/media/bulk-trash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? 'Failed to move to trash');
    }
  };

  const restoreItems = async (ids: string[]) => {
    const res = await fetch('/api/v1/media/bulk-restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? 'Failed to restore');
    }
  };

  const deleteItemsPermanently = async (ids: string[]) => {
    const res = await fetch('/api/v1/media/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? 'Failed to delete');
    }
  };

  const handleDelete = async (item: MediaAsset) => {
    if (isTrash) {
      if (!confirm(`Permanently delete "${item.originalFilename}"? This cannot be undone.`)) {
        return;
      }
      const toastId = toast.progress(`Deleting "${item.originalFilename}"`, {
        loadingStyle: 'dots',
      });
      try {
        await deleteItemsPermanently([item.id]);
        updateSelection(selectedIds.filter((id) => id !== item.id));
        refresh();
        toast.success('File deleted permanently', { id: toastId });
      } catch (err) {
        toast.failure(err instanceof Error ? err.message : 'Failed to delete file', { id: toastId });
      }
    } else {
      if (!confirm(`Move "${item.originalFilename}" to trash?`)) return;
      const toastId = toast.progress(`Moving "${item.originalFilename}" to trash`, {
        loadingStyle: 'dots',
      });
      try {
        await trashItems([item.id]);
        updateSelection(selectedIds.filter((id) => id !== item.id));
        refresh();
        toast.success('Moved to trash', { id: toastId });
      } catch (err) {
        toast.failure(err instanceof Error ? err.message : 'Failed to move to trash', { id: toastId });
      }
    }
  };

  const handleRestore = async (item: MediaAsset) => {
    const toastId = toast.progress(`Restoring "${item.originalFilename}"`, {
      loadingStyle: 'dots',
    });
    try {
      await restoreItems([item.id]);
      updateSelection(selectedIds.filter((id) => id !== item.id));
      refresh();
      toast.success('File restored', { id: toastId });
    } catch (err) {
      toast.failure(err instanceof Error ? err.message : 'Failed to restore file', { id: toastId });
    }
  };

  const handleBulkTrash = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Move ${selectedIds.length} item(s) to trash?`)) return;
    setBulkBusy(true);
    const toastId = toast.progress(`Moving ${selectedIds.length} item(s) to trash`, {
      loadingStyle: 'dots',
    });
    try {
      await trashItems(selectedIds);
      updateSelection([]);
      refresh();
      toast.success(`Moved ${selectedIds.length} item(s) to trash`, { id: toastId });
    } catch (err) {
      toast.failure(err instanceof Error ? err.message : 'Bulk move to trash failed', { id: toastId });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    const toastId = toast.progress(`Restoring ${selectedIds.length} item(s)`, {
      loadingStyle: 'dots',
    });
    try {
      await restoreItems(selectedIds);
      updateSelection([]);
      refresh();
      toast.success(`Restored ${selectedIds.length} item(s)`, { id: toastId });
    } catch (err) {
      toast.failure(err instanceof Error ? err.message : 'Bulk restore failed', { id: toastId });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Permanently delete ${selectedIds.length} item(s)? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkBusy(true);
    const toastId = toast.progress(`Deleting ${selectedIds.length} item(s)`, {
      loadingStyle: 'dots',
    });
    try {
      await deleteItemsPermanently(selectedIds);
      updateSelection([]);
      refresh();
      toast.success(`Deleted ${selectedIds.length} item(s)`, { id: toastId });
    } catch (err) {
      toast.failure(err instanceof Error ? err.message : 'Bulk delete failed', { id: toastId });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (trashCount === 0) return;
    if (!confirm(`Permanently delete all ${trashCount} item(s) in trash?`)) return;
    setBulkBusy(true);
    const toastId = toast.progress('Emptying trash', { loadingStyle: 'dots' });
    try {
      const res = await fetch('/api/v1/media/empty-trash', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to empty trash');
      }
      updateSelection([]);
      refresh();
      toast.success('Trash emptied', { id: toastId });
    } catch (err) {
      toast.failure(err instanceof Error ? err.message : 'Failed to empty trash', { id: toastId });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleNewFolder = () => {
    const name = prompt('Folder name (e.g. /brand or brand):');
    if (!name?.trim()) return;
    const normalized = name.startsWith('/') ? name : `/${name}`;
    setFolder(normalized);
    if (!folders.some((f) => f.folder === normalized)) {
      setFolders((prev) =>
        [...prev, { folder: normalized, count: 0 }].sort((a, b) =>
          a.folder.localeCompare(b.folder),
        ),
      );
    }
    toast.success(`Switched to folder "${normalized.replace(/^\//, '') || 'root'}"`);
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

  const sharedItemProps = {
    showSelection,
    isTrash,
    onToggleSelect: toggleSelect,
    onOpen: handleOpen,
    onEdit: handleEdit,
    onCopyUrl: handleCopyUrl,
    onDownload: handleDownload,
    onDelete: handleDelete,
    onRestore: handleRestore,
  };

  const emptyMessage = isTrash ? 'Trash is empty' : 'No media in this folder';

  return (
    <div className={embedded ? 'space-y-4' : 'mx-auto flex max-w-7xl flex-col gap-6'}>
      <MediaLibraryHeader
        stats={stats}
        embedded={embedded}
        onUploadClick={() => uploadRef.current?.click()}
        onNewFolder={handleNewFolder}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 space-y-4 lg:w-56">
          <MediaFoldersSidebar folders={folders} selected={folder} onSelect={setFolder} />
          {!embedded && <MediaStorageCard stats={stats} />}
        </aside>

        <div className="relative min-w-0 flex-1 space-y-4">
          {!isTrash && (
            <MediaUploadZone
              folder={folder}
              compact={!embedded}
              inputRef={uploadRef}
              onUploaded={refresh}
            />
          )}

          {isTrash && trashCount > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {trashCount} item(s) in trash
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                disabled={bulkBusy}
                onClick={() => void handleEmptyTrash()}
              >
                Empty trash
              </Button>
            </div>
          )}

          <MediaToolbar
            search={search}
            onSearchChange={setSearch}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            view={view}
            onViewChange={handleViewChange}
            showSelection={showSelection && items.length > 0}
            allPageSelected={allPageSelected}
            selectedCount={selectedIds.length}
            onToggleSelectAll={toggleSelectAll}
          />

          <MediaBulkBar
            count={selectedIds.length}
            isTrash={isTrash}
            busy={bulkBusy}
            onTrash={() => void handleBulkTrash()}
            onRestore={() => void handleBulkRestore()}
            onDelete={() => void handleBulkDelete()}
            onClear={() => updateSelection([])}
          />

          {loading ? (
            view === 'list' ? (
              <TableSkeleton rows={6} columns={6} />
            ) : (
              <MediaGridSkeleton />
            )
          ) : view === 'grid' ? (
            items.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                {items.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    selected={selectedIds.includes(item.id)}
                    {...sharedItemProps}
                  />
                ))}
              </div>
            )
          ) : (
            <MediaListView
              items={items}
              selectedIds={selectedIds}
              allPageSelected={allPageSelected}
              onToggleSelectAll={toggleSelectAll}
              {...sharedItemProps}
            />
          )}

          <MediaPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
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
            refresh();
          }}
        />
      )}
    </div>
  );
}
