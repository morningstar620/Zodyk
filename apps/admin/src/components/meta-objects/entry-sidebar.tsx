'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';

type EntrySidebarProps = {
  status: string;
  handle?: string;
  updatedAt?: string;
  createdAt?: string;
  onStatusChange?: (status: string) => void;
};

export function EntrySidebar({
  status,
  handle,
  updatedAt,
  createdAt,
}: EntrySidebarProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current status</span>
            <Badge
              variant={
                status === 'published'
                  ? 'success'
                  : status === 'draft'
                    ? 'secondary'
                    : 'outline'
              }
            >
              {status}
            </Badge>
          </div>
          {handle && (
            <div>
              <p className="text-xs text-muted-foreground">Handle</p>
              <p className="font-mono text-sm text-foreground">/{handle}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {createdAt && (
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="text-foreground">{new Date(createdAt).toLocaleString()}</p>
            </div>
          )}
          {updatedAt && (
            <div>
              <p className="text-muted-foreground">Last updated</p>
              <p className="text-foreground">{new Date(updatedAt).toLocaleString()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
