'use client';

import { SidebarGitCard } from './sidebar-git-card';
import { SidebarHeader } from './sidebar-header';
import { SidebarNav } from './sidebar-nav';

export function AppSidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="shrink-0 border-b border-sidebar-border p-4">
        <SidebarHeader />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        <SidebarNav />
      </div>

      <div className="shrink-0 border-t border-sidebar-border p-4">
        <SidebarGitCard />
      </div>
    </aside>
  );
}
