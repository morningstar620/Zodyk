import { Badge, Card, CardContent } from '@zodyk/shared-ui';
import { Database } from 'lucide-react';
import Link from 'next/link';

type MetaObjectCardProps = {
  name: string;
  slug: string;
  description?: string;
  fieldCount: number;
  entryCount?: number;
};

export function MetaObjectCard({
  name,
  slug,
  description,
  fieldCount,
  entryCount = 0,
}: MetaObjectCardProps) {
  return (
    <Link href={`/meta-objects/${slug}`} prefetch className="group block">
      <Card className="h-full transition-colors hover:border-primary/30 hover:bg-muted/20">
        <CardContent className="p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-foreground group-hover:text-primary">
                {name}
              </h3>
              {description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {entryCount.toLocaleString()} {entryCount === 1 ? 'entry' : 'entries'}
            </span>
            <Badge variant="secondary">{fieldCount} fields</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
