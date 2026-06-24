'use client';

import { SEO_GROUP_KEY, type MetaFieldGroup } from '@zodyk/core';
import { Button, Input, Label } from '@zodyk/shared-ui';
import { slugify } from './utils';

interface FieldGroupEditorProps {
  groups: MetaFieldGroup[];
  onChange: (groups: MetaFieldGroup[]) => void;
}

export function FieldGroupEditor({ groups, onChange }: FieldGroupEditorProps) {
  const userGroups = groups
    .filter((g) => !g.isSystem)
    .sort((a, b) => a.order - b.order);
  const seoGroup = groups.find((g) => g.key === SEO_GROUP_KEY);

  const addGroup = () => {
    const label = 'New Group';
    const key = slugify(label);
    onChange([
      ...groups.filter((g) => g.key !== SEO_GROUP_KEY),
      { key, label, order: userGroups.length, isSystem: false },
      ...(seoGroup ? [seoGroup] : []),
    ]);
  };

  const updateGroup = (key: string, patch: Partial<MetaFieldGroup>) => {
    onChange(groups.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  };

  const removeGroup = (key: string) => {
    onChange(groups.filter((g) => g.key !== key));
  };

  return (
    <div className="flex flex-col gap-4">
      {userGroups.map((group) => (
        <div key={group.key} className="rounded-md border border-zinc-200 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Group label</Label>
              <Input
                value={group.label}
                onChange={(e) => updateGroup(group.key, { label: e.target.value })}
              />
            </div>
            <div>
              <Label>Group key</Label>
              <Input value={group.key} disabled />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => removeGroup(group.key)}
          >
            Remove group
          </Button>
        </div>
      ))}

      {seoGroup && (
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4">
          <p className="font-medium text-zinc-900">{seoGroup.label}</p>
          <p className="text-sm text-zinc-500">System group — cannot be removed</p>
        </div>
      )}

      <Button type="button" variant="outline" onClick={addGroup}>
        Add field group
      </Button>
    </div>
  );
}
