'use client';

import type { EntityRelationship } from '@zodyk/core';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from '@zodyk/shared-ui';
import { Plus, Trash2 } from 'lucide-react';
import type { EntityTarget } from './system-entity-types';

type RelationshipsPanelProps = {
  relationships: EntityRelationship[];
  onChange: (relationships: EntityRelationship[]) => void;
  entityTargets: EntityTarget[];
  currentSlug: string;
};

export function RelationshipsPanel({
  relationships,
  onChange,
  entityTargets,
  currentSlug,
}: RelationshipsPanelProps) {
  const addRelationship = () => {
    onChange([
      ...relationships,
      {
        key: `rel_${relationships.length + 1}`,
        label: 'New Relationship',
        sourceFieldKey: '',
        targetCategory: 'system',
        targetSlug: '',
        cardinality: 'one_to_many',
        selfReference: false,
        required: false,
        order: relationships.length,
      },
    ]);
  };

  const update = (index: number, patch: Partial<EntityRelationship>) => {
    onChange(relationships.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const remove = (index: number) => {
    onChange(relationships.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relationships</CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect this entity to meta objects or other system entities.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {relationships.map((rel, index) => (
          <div key={rel.key} className="space-y-3 rounded-lg border border-border p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Label</Label>
                <Input value={rel.label} onChange={(e) => update(index, { label: e.target.value })} />
              </div>
              <div>
                <Label>Key</Label>
                <Input value={rel.key} onChange={(e) => update(index, { key: e.target.value })} />
              </div>
              <div>
                <Label>Source field key</Label>
                <Input
                  value={rel.sourceFieldKey}
                  onChange={(e) => update(index, { sourceFieldKey: e.target.value })}
                />
              </div>
              <div>
                <Label>Cardinality</Label>
                <Select
                  value={rel.cardinality}
                  onChange={(e) =>
                    update(index, { cardinality: e.target.value as EntityRelationship['cardinality'] })
                  }
                >
                  <option value="one_to_one">One to One</option>
                  <option value="one_to_many">One to Many</option>
                  <option value="many_to_many">Many to Many</option>
                  <option value="self">Self Reference</option>
                </Select>
              </div>
              <div>
                <Label>Target</Label>
                <Select
                  value={rel.selfReference ? `self:${currentSlug}` : `${rel.targetCategory}:${rel.targetSlug}`}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.startsWith('self:')) {
                      update(index, {
                        selfReference: true,
                        targetCategory: 'system',
                        targetSlug: currentSlug,
                      });
                    } else {
                      const [category, slug] = value.split(':') as ['meta_object' | 'system', string];
                      update(index, {
                        selfReference: false,
                        targetCategory: category,
                        targetSlug: slug,
                      });
                    }
                  }}
                >
                  <option value="">Select target</option>
                  <option value={`self:${currentSlug}`}>Self ({currentSlug})</option>
                  {entityTargets
                    .filter((t) => t.slug !== currentSlug || t.category !== 'system')
                    .map((t) => (
                      <option key={`${t.category}:${t.slug}`} value={`${t.category}:${t.slug}`}>
                        {t.name} ({t.category === 'meta_object' ? 'Meta Object' : 'System'})
                      </option>
                    ))}
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rel.required ?? false}
                    onChange={(e) => update(index, { required: e.target.checked })}
                  />
                  Required
                </label>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" className="w-full" onClick={addRelationship}>
          <Plus className="h-4 w-4" />
          Add relationship
        </Button>
      </CardContent>
    </Card>
  );
}
