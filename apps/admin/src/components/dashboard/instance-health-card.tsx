'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import { useApi } from '@/hooks/use-api';

type StorageHealth = {
  configured: boolean;
  connection: boolean;
  connectionError?: string;
  error?: string;
};

type ThemeHealth = {
  issues: unknown[];
  themeId: string | null;
};

type Status = {
  label: string;
  variant: 'success' | 'destructive' | 'secondary';
};

type HealthRow = {
  name: string;
  detail: string;
  status: Status;
};

export function InstanceHealthCard() {
  const storage = useApi<StorageHealth>('/api/v1/storage/health');
  const theme = useApi<ThemeHealth>('/api/v1/themes/health');

  const checking: Status = { label: 'Checking', variant: 'secondary' };
  const apiReachable = !storage.error && !theme.error;

  let storageRow: HealthRow;
  if (storage.isLoading) {
    storageRow = { name: 'Media storage', detail: 'Checking configuration', status: checking };
  } else if (storage.error || !storage.data) {
    storageRow = {
      name: 'Media storage',
      detail: storage.error?.message ?? 'Health check failed',
      status: { label: 'Unavailable', variant: 'destructive' },
    };
  } else if (!storage.data.configured) {
    storageRow = {
      name: 'Media storage',
      detail: 'Storage is not configured',
      status: { label: 'Not configured', variant: 'secondary' },
    };
  } else if (storage.data.connection) {
    storageRow = {
      name: 'Media storage',
      detail: 'Connection verified',
      status: { label: 'Connected', variant: 'success' },
    };
  } else {
    storageRow = {
      name: 'Media storage',
      detail: storage.data.error ?? storage.data.connectionError ?? 'Connection failed',
      status: { label: 'Connection failed', variant: 'destructive' },
    };
  }

  let themeRow: HealthRow;
  if (theme.isLoading) {
    themeRow = { name: 'Active theme', detail: 'Checking templates', status: checking };
  } else if (theme.error || !theme.data) {
    themeRow = {
      name: 'Active theme',
      detail: theme.error?.message ?? 'Health check failed',
      status: { label: 'Unavailable', variant: 'destructive' },
    };
  } else if (!theme.data.themeId) {
    themeRow = {
      name: 'Active theme',
      detail: 'No live theme',
      status: { label: 'Not configured', variant: 'secondary' },
    };
  } else if (theme.data.issues.length === 0) {
    themeRow = {
      name: 'Active theme',
      detail: 'No template issues',
      status: { label: 'Healthy', variant: 'success' },
    };
  } else {
    themeRow = {
      name: 'Active theme',
      detail: `${theme.data.issues.length} template issue${
        theme.data.issues.length === 1 ? '' : 's'
      }`,
      status: { label: 'Needs attention', variant: 'destructive' },
    };
  }

  const rows: HealthRow[] = [
    {
      name: 'Admin API',
      detail:
        storage.isLoading || theme.isLoading
          ? 'Checking /api/v1'
          : apiReachable
            ? 'Responding to /api/v1'
            : 'Request failed',
      status: storage.isLoading || theme.isLoading
        ? checking
        : apiReachable
          ? { label: 'Reachable', variant: 'success' }
          : { label: 'Unreachable', variant: 'destructive' },
    },
    storageRow,
    themeRow,
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>Instance health</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{row.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.detail}</p>
              </div>
              <Badge variant={row.status.variant}>{row.status.label}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
