'use client';

import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@zodyk/shared-ui';
import { cn } from '@zodyk/shared-ui';

type ObjectSettingsCardProps = {
  name: string;
  slug: string;
  publicApi: boolean;
  onNameChange: (name: string) => void;
  onPublicApiChange: (enabled: boolean) => void;
};

export function ObjectSettingsCard({
  name,
  slug,
  publicApi,
  onNameChange,
  onPublicApiChange,
}: ObjectSettingsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Object settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="apiIdentifier">API identifier</Label>
          <Input id="apiIdentifier" value={slug} readOnly className="bg-muted/50" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-foreground">Public API</p>
            <p className="text-xs text-muted-foreground">Allow public read access via REST</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={publicApi}
            onClick={() => onPublicApiChange(!publicApi)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
              publicApi ? 'bg-primary' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                publicApi && 'translate-x-5',
              )}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
