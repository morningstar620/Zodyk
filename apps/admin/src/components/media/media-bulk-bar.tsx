'use client';

import { Button } from '@zodyk/shared-ui';
import { RotateCcw, Trash2, X } from 'lucide-react';

type MediaBulkBarProps = {
  count: number;
  isTrash: boolean;
  onTrash: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onClear: () => void;
  busy?: boolean;
};

export function MediaBulkBar({
  count,
  isTrash,
  onTrash,
  onRestore,
  onDelete,
  onClear,
  busy,
}: MediaBulkBarProps) {
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <span className="text-sm font-medium text-foreground">
        {count} selected
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {isTrash ? (
          <>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onRestore}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Restore
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete permanently
            </Button>
          </>
        ) : (
          <>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onTrash}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              Move to trash
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete permanently
            </Button>
          </>
        )}

        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onClear}>
          <X className="mr-1.5 h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
