'use client';

import { BookOpen, Star } from 'lucide-react';
import { GitHubIcon } from '@/components/icons/github';

export function SidebarGitCard() {
  return (
    <div className="rounded-lg border border-sidebar-border bg-muted/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <GitHubIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-sidebar-foreground">zodyk/zodyk</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Open source · MIT License</p>
      <div className="flex items-center gap-2">
        <a
          href="https://github.com/zodyk/zodyk"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Star className="h-3 w-3" />
          Star
          <span className="text-muted-foreground">18.4k</span>
        </a>
        <a
          href="https://docs.zodyk.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <BookOpen className="h-3 w-3" />
          Docs
        </a>
      </div>
    </div>
  );
}
