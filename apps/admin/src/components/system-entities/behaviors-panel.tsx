'use client';

import { BEHAVIOR_KEYS, behaviorRegistry } from '@zodyk/core';
import { Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';

type BehaviorsPanelProps = {
  behaviors: Record<string, boolean>;
  onChange: (behaviors: Record<string, boolean>) => void;
};

export function BehaviorsPanel({ behaviors, onChange }: BehaviorsPanelProps) {
  const registered = behaviorRegistry.list();
  const keys = registered.length > 0 ? registered.map((b) => b.key) : [...BEHAVIOR_KEYS];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Behaviors</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enable platform capabilities for this entity. Additional behaviors can be registered by plugins.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {keys.map((key) => {
          const meta = behaviorRegistry.get(key);
          return (
            <label
              key={key}
              className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-3 hover:bg-muted/30"
            >
              <div>
                <p className="font-medium text-foreground">{meta?.label ?? key}</p>
                {meta?.description && (
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                )}
              </div>
              <input
                type="checkbox"
                checked={behaviors[key] ?? false}
                onChange={(e) => onChange({ ...behaviors, [key]: e.target.checked })}
                className="mt-1"
              />
            </label>
          );
        })}
      </CardContent>
    </Card>
  );
}
