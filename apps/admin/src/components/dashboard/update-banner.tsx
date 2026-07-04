import { Button } from '@zodyk/shared-ui';
import { Sparkles } from 'lucide-react';

export function UpdateBanner() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-accent px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Zodyk v2.4 is here</p>
          <p className="text-sm text-muted-foreground">
            Visual workflow builder, improved theme editor, and faster media uploads.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" className="bg-card">
          Release notes
        </Button>
        <Button size="sm">Update instance</Button>
      </div>
    </div>
  );
}
