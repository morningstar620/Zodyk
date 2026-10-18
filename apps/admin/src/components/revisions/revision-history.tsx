'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import { History } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApi } from '@/hooks/use-api';

type RevisionRow = {
  id: string;
  revision: number;
  createdAt: string;
  createdBy?: string | null;
  status?: string | null;
  title?: string | null;
  current: boolean;
};

type FieldDiff = {
  field: string;
  before: unknown;
  after: unknown;
};

type DiffLine = {
  type: 'context' | 'added' | 'removed';
  text: string;
};

type RevisionDetail = RevisionRow & {
  diff: FieldDiff[];
  textDiff: DiffLine[];
  textField: string;
};

type RevisionHistoryProps = {
  listUrl: string;
  refreshKey?: string;
  onRestored?: () => Promise<void> | void;
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function preview(value: unknown): string {
  if (value == null || value === '') return 'empty';
  if (typeof value === 'string') return value.length > 80 ? `${value.slice(0, 80)}…` : value;
  return JSON.stringify(value);
}

export function RevisionHistory({ listUrl, refreshKey, onRestored }: RevisionHistoryProps) {
  const { data, isLoading, mutate } = useApi<{ data: RevisionRow[] }>(listUrl);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RevisionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (refreshKey) void mutate();
  }, [refreshKey, mutate]);

  async function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(`${listUrl}/${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to load revision');
      setDetail(body as RevisionDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revision');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function restore(row: RevisionRow) {
    if (row.current) return;
    if (!window.confirm('Restore this revision? The current content stays in the history.')) return;
    setRestoringId(row.id);
    setError(null);
    try {
      const res = await fetch(`${listUrl}/${row.id}/restore`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to restore revision');
      await onRestored?.();
      await mutate();
      setOpenId(null);
      setDetail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore revision');
    } finally {
      setRestoringId(null);
    }
  }

  const rows = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm font-medium">Revision history</CardTitle>
        <History className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {isLoading && !data ? (
          <p className="text-sm text-muted-foreground">Loading revisions…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Revisions are saved each time this content changes.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li key={row.id} className="rounded-md border border-border">
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggle(row.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-foreground">
                      Revision {row.revision}
                      {row.current ? ' · Current' : ''}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatWhen(row.createdAt)}
                      {row.status ? ` · ${row.status}` : ''}
                      {row.title ? ` · ${row.title}` : ''}
                    </p>
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={row.current || restoringId === row.id}
                    onClick={() => restore(row)}
                  >
                    {restoringId === row.id ? 'Restoring…' : 'Restore'}
                  </Button>
                </div>
                {openId === row.id && (
                  <div className="border-t border-border px-3 py-3">
                    {loadingDetail || detail?.id !== row.id ? (
                      <p className="text-xs text-muted-foreground">Loading changes…</p>
                    ) : detail.diff.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Matches the current version.</p>
                    ) : (
                      <div className="space-y-3">
                        <ul className="space-y-1">
                          {detail.diff
                            .filter((change) => change.field !== detail.textField)
                            .map((change) => (
                              <li key={change.field} className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{change.field}</span>
                                {': '}
                                {preview(change.before)} → {preview(change.after)}
                              </li>
                            ))}
                        </ul>
                        {detail.textDiff.length > 0 && (
                          <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-5">
                            {detail.textDiff.map((line, index) => (
                              <div
                                key={`${line.type}-${index}`}
                                className={
                                  line.type === 'added'
                                    ? 'text-emerald-700'
                                    : line.type === 'removed'
                                      ? 'text-destructive'
                                      : 'text-muted-foreground'
                                }
                              >
                                {line.type === 'added'
                                  ? '+ '
                                  : line.type === 'removed'
                                    ? '- '
                                    : '  '}
                                {line.text}
                              </div>
                            ))}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
