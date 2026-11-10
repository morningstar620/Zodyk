'use client';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@zodyk/shared-ui';
import { useApi } from '@/hooks/use-api';
import { formatAuditAction, formatRelativeTime } from '@/lib/audit-log-format';
import { TableSkeleton } from '@/components/skeletons';

type AuditLogRow = {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip?: string;
  createdAt: string;
  actor: { id: string; name?: string; email?: string } | null;
};

type AuditLogsResponse = {
  data: AuditLogRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export default function AuditLogsPage() {
  const { data, error, isLoading } = useApi<AuditLogsResponse>('/api/v1/audit-logs?limit=50');

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent changes recorded for this site. Newest first.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <TableSkeleton rows={8} columns={5} />}
          {!isLoading && error && (
            <p className="text-sm text-muted-foreground">
              Audit log is unavailable: {error.message}
            </p>
          )}
          {!isLoading && !error && (data?.data.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No activity has been recorded yet.</p>
          )}
          {!isLoading && !error && data && data.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {row.actor?.name ?? 'System'}
                      </span>
                      {row.actor?.email && (
                        <span className="block text-xs text-muted-foreground">
                          {row.actor.email}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatAuditAction(row.action)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.resource}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.ip ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatRelativeTime(row.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
