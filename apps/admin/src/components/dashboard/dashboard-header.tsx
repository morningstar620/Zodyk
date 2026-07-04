'use client';

import { ExternalLink, Plus } from 'lucide-react';
import Link from 'next/link';

type DashboardHeaderProps = {
  userName?: string | null;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const firstName = userName?.split(' ')[0] ?? 'there';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your self-hosted Zodyk instance at acme.studio is up to date and healthy.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View site
        </a>
        <Link
          href="/pages/new"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          New page
        </Link>
      </div>
    </div>
  );
}
