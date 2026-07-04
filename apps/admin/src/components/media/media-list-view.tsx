'use client';

import type { MediaAsset } from '@zodyk/core';
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@zodyk/shared-ui';
import { MediaActionsMenu } from './media-actions-menu';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type MediaListViewProps = {
  items: MediaAsset[];
  selectedIds: string[];
  showSelection?: boolean;
  isTrash?: boolean;
  allPageSelected?: boolean;
  onToggleSelectAll?: () => void;
  onToggleSelect: (id: string) => void;
  onOpen: (item: MediaAsset) => void;
  onEdit: (item: MediaAsset) => void;
  onCopyUrl: (item: MediaAsset) => void;
  onDownload: (item: MediaAsset) => void;
  onDelete: (item: MediaAsset) => void;
  onRestore?: (item: MediaAsset) => void;
};

export function MediaListView({
  items,
  selectedIds,
  showSelection,
  isTrash,
  allPageSelected,
  onToggleSelectAll,
  onToggleSelect,
  onOpen,
  onEdit,
  onCopyUrl,
  onDownload,
  onDelete,
  onRestore,
}: MediaListViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
        {isTrash ? 'Trash is empty' : 'No media in this folder'}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {showSelection && (
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={Boolean(allPageSelected)}
                  onChange={() => onToggleSelectAll?.()}
                  aria-label="Select all on this page"
                  className="rounded border-border"
                />
              </TableHead>
            )}
            <TableHead className="w-16">Preview</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Dimensions</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isImage = item.mimeType.startsWith('image/');
            const canEdit = isImage && !item.mimeType.includes('svg') && !isTrash;
            const selected = selectedIds.includes(item.id);
            return (
              <TableRow
                key={item.id}
                className={cn('cursor-pointer', selected && 'bg-muted/50')}
                onClick={() => onOpen(item)}
              >
                {showSelection && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelect(item.id)}
                      aria-label={`Select ${item.originalFilename}`}
                      className="rounded border-border"
                    />
                  </TableCell>
                )}
                <TableCell>
                  {isImage ? (
                    <img
                      src={item.variantUrls?.webp ?? item.url}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                      {item.mimeType.split('/')[1]?.slice(0, 4) ?? 'file'}
                    </div>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate font-medium">
                  {item.originalFilename}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.mimeType.split('/')[0]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatSize(item.size)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.width && item.height ? `${item.width} × ${item.height}` : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <MediaActionsMenu
                    canEdit={canEdit}
                    isTrash={isTrash}
                    onAction={(action) => {
                      if (action === 'edit') onEdit(item);
                      else if (action === 'copy') onCopyUrl(item);
                      else if (action === 'download') onDownload(item);
                      else if (action === 'restore') onRestore?.(item);
                      else if (action === 'delete') onDelete(item);
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
