'use client';

import { Button, Logo } from '@zodyk/shared-ui';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export function SidebarHeader() {
  return (
    <div className="space-y-4">
      <Link href="/" className="flex items-center gap-2.5 px-1">
        <Logo width={32} height={32} className="h-6 w-6 shrink-0" />
        <p className="truncate text-lg font-semibold tracking-wide text-sidebar-foreground [font-family:var(--font-geist-sans)]">
          ZOD<span className="text-[#0b65f8]">Y</span>K
        </p>
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
