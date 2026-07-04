'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@zodyk/shared-ui';
import { Copy, Download, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react';

type MediaAction = 'edit' | 'copy' | 'download' | 'restore' | 'delete';

type MediaActionsMenuProps = {
  canEdit: boolean;
  isTrash?: boolean;
  onAction: (action: MediaAction) => void;
  className?: string;
};

export function MediaActionsMenu({
  canEdit,
  isTrash,
  onAction,
  className,
}: MediaActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const items: {
    action: MediaAction;
    label: string;
    icon: typeof Pencil;
    hidden?: boolean;
    destructive?: boolean;
  }[] = [
    { action: 'edit', label: 'Edit', icon: Pencil, hidden: !canEdit },
    { action: 'copy', label: 'Copy URL', icon: Copy },
    { action: 'download', label: 'Download', icon: Download },
    {
      action: 'restore',
      label: 'Restore',
      icon: RotateCcw,
      hidden: !isTrash,
    },
    {
      action: 'delete',
      label: isTrash ? 'Delete permanently' : 'Move to trash',
      icon: Trash2,
      destructive: true,
    },
  ];

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-card/90 text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-1 min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-lg">
          {items
            .filter((item) => !item.hidden)
            .map(({ action, label, icon: Icon, destructive }) => (
              <button
                key={action}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onAction(action);
                }}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted',
                  destructive ? 'text-destructive' : 'text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
