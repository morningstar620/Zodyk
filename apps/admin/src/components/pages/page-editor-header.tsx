'use client';

import { Button, cn } from '@zodyk/shared-ui';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileText,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';

type PageEditorHeaderProps = {
  mode: 'create' | 'edit';
  title: string;
  pageId?: string;
  prevPageId?: string;
  nextPageId?: string;
  viewUrl?: string;
  onDuplicate?: () => void;
  onDelete?: () => void;
  duplicating?: boolean;
  deleting?: boolean;
};

export function PageEditorHeader({
  mode,
  title,
  pageId,
  prevPageId,
  nextPageId,
  viewUrl,
  onDuplicate,
  onDelete,
  duplicating,
  deleting,
}: PageEditorHeaderProps) {
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

  const breadcrumbLabel = mode === 'create' ? 'Add page' : title || 'Untitled';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <PageBreadcrumbs
            items={[
              { label: 'Content', href: '/pages' },
              { label: 'Pages', href: '/pages' },
              { label: breadcrumbLabel },
            ]}
            className="mb-1"
          />
          {mode === 'edit' && (
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {mode === 'edit' && onDuplicate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={duplicating}
            onClick={onDuplicate}
            className="bg-card"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
        )}
        {mode === 'edit' && viewUrl && (
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" />
            View
          </a>
        )}
        {mode === 'edit' && onDelete && (
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
                  Delete page
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'edit' && pageId && (
          <div className="flex overflow-hidden rounded-lg border border-border">
            {prevPageId ? (
              <Link
                href={`/pages/${prevPageId}`}
                aria-label="Previous page"
                className="inline-flex h-9 w-9 items-center justify-center bg-card text-foreground hover:bg-muted"
              >
                <ChevronUp className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex h-9 w-9 items-center justify-center bg-card text-muted-foreground opacity-40">
                <ChevronUp className="h-4 w-4" />
              </span>
            )}
            {nextPageId ? (
              <Link
                href={`/pages/${nextPageId}`}
                aria-label="Next page"
                className="inline-flex h-9 w-9 items-center justify-center border-l border-border bg-card text-foreground hover:bg-muted"
              >
                <ChevronDown className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex h-9 w-9 items-center justify-center border-l border-border bg-card text-muted-foreground opacity-40">
                <ChevronDown className="h-4 w-4" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
