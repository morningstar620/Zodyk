'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { formatAuditAction, formatRelativeTime } from '@/lib/audit-log-format';

type AuditLogRow = {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  createdAt: string;
  actor: { name?: string; email?: string } | null;
};

type AuditLogsResponse = {
  data: AuditLogRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export function RecentActivityCard() {
  const { data, error, isLoading } = useApi<AuditLogsResponse>('/api/v1/audit-logs?limit=5');
  const activities = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>Recent activity</CardTitle>
        <Link href="/audit-logs" className="text-sm font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading activity...</p>}
        {!isLoading && error && (
          <p className="text-sm text-muted-foreground">
            Recent activity is unavailable: {error.message}
          </p>
        )}
        {!isLoading && !error && activities.length === 0 && (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        )}
        {!isLoading && !error && activities.length > 0 && (
          <ul className="divide-y divide-border">
            {activities.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    <span className="font-medium">{item.actor?.name ?? 'System'}</span>{' '}
                    {formatAuditAction(item.action)}
                    {item.resource ? ` · ${item.resource}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
