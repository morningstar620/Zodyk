'use client';

import type { MediaStorageStats } from '@zodyk/core';
import { Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

type MediaStorageCardProps = {
  stats: MediaStorageStats | null;
};

const LEGEND = [
  { key: 'images' as const, label: 'Images', color: 'bg-blue-500' },
  { key: 'video' as const, label: 'Video', color: 'bg-sky-400' },
  { key: 'documents' as const, label: 'Documents', color: 'bg-emerald-500' },
];

export function MediaStorageCard({ stats }: MediaStorageCardProps) {
  const totalBytes = stats?.totalBytes ?? 0;
  const quotaBytes = stats?.quotaBytes ?? 100 * 1024 * 1024 * 1024;
  const pct = quotaBytes > 0 ? Math.min(100, (totalBytes / quotaBytes) * 100) : 0;

  const segments = stats
    ? [
        { bytes: stats.imagesBytes, color: 'bg-blue-500' },
        { bytes: stats.videoBytes, color: 'bg-sky-400' },
        { bytes: stats.documentsBytes, color: 'bg-emerald-500' },
      ]
    : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Storage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {formatBytes(totalBytes)} of {formatBytes(quotaBytes)} on R2
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="flex h-full" style={{ width: `${pct}%` }}>
            {segments.map((seg, i) => {
              const segPct = totalBytes > 0 ? (seg.bytes / totalBytes) * 100 : 0;
              return (
                <div
                  key={i}
                  className={`h-full ${seg.color}`}
                  style={{ width: `${segPct}%` }}
                />
              );
            })}
          </div>
        </div>
        <ul className="space-y-2">
          {LEGEND.map(({ key, label, color }) => {
            const bytes =
              key === 'images'
                ? (stats?.imagesBytes ?? 0)
                : key === 'video'
                  ? (stats?.videoBytes ?? 0)
                  : (stats?.documentsBytes ?? 0);
            return (
              <li key={key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${color}`} />
                  {label}
                </span>
                <span className="text-foreground">{formatBytes(bytes)}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
