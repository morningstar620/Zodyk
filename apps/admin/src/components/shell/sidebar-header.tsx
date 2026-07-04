'use client';

import { Button } from '@zodyk/shared-ui';
import { Plus } from 'lucide-react';
import Link from 'next/link';

type SidebarHeaderProps = {
  workspaceName?: string;
};

export function SidebarHeader({ workspaceName = 'acme.studio' }: SidebarHeaderProps) {
  return (
    <div className="space-y-4">
      <Link href="/" className="flex items-center gap-2.5 px-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          Z
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">Zodyk</p>
          <p className="truncate text-xs text-muted-foreground">{workspaceName}</p>
        </div>
      </Link>

      <Button className="w-full justify-between" size="sm">
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create new
        </span>
        <kbd className="pointer-events-none hidden rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
          ⌘N
        </kbd>
      </Button>
    </div>
  );
}
