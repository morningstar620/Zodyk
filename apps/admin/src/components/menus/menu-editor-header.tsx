'use client';

import { Button, cn } from '@zodyk/shared-ui';
import { ChevronDown, Menu, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';

type MenuEditorHeaderProps = {
  mode: 'create' | 'edit';
  title: string;
  menuId?: string;
  onDelete?: () => void;
  deleting?: boolean;
};

export function MenuEditorHeader({
  mode,
  title,
  menuId,
  onDelete,
  deleting,
}: MenuEditorHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const breadcrumbLabel = mode === 'create' ? 'Add menu' : title || 'Untitled';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
          <Menu className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <PageBreadcrumbs
            items={[
              { label: 'Content', href: '/menus' },
              { label: 'Menus', href: '/menus' },
              { label: breadcrumbLabel },
            ]}
            className="mb-1"
          />
          {mode === 'edit' && (
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          )}
        </div>
      </div>

      {mode === 'edit' && onDelete && menuId && (
        <div ref={menuRef} className="relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMenuOpen((open) => !open)}
            className="bg-card"
          >
            More actions
            <ChevronDown className={cn('h-4 w-4 transition-transform', menuOpen && 'rotate-180')} />
          </Button>
          {menuOpen && (
            <div className="absolute top-full right-0 z-50 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-muted disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete menu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
