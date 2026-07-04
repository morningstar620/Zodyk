'use client';

import { Badge, Card, CardContent } from '@zodyk/shared-ui';
import { Database } from 'lucide-react';
import Link from 'next/link';

type EntityCardProps = {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  fieldCount: number;
  recordCount?: number;
  enabled?: boolean;
  systemCategory?: string;
};

export function EntityCard({
  name,
  slug,
  description,
  color,
  fieldCount,
  recordCount,
  enabled = true,
  systemCategory,
}: EntityCardProps) {
  return (
    <Link href={`/system-entities/${slug}`}>
      <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/20">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: color ? `${color}20` : undefined }}
            >
              <Database
                className="h-5 w-5"
                style={{ color: color ?? undefined }}
              />
            </div>
            <div className="flex gap-1">
              {!enabled && <Badge variant="secondary">Disabled</Badge>}
              {systemCategory && <Badge variant="outline">{systemCategory}</Badge>}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground">{slug}</p>
          </div>
          {description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
          )}
          <div className="mt-auto flex gap-3 text-xs text-muted-foreground">
            <span>{recordCount ?? 0} records</span>
            <span>{fieldCount} fields</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
