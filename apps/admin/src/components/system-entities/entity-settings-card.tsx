'use client';

import { Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from '@zodyk/shared-ui';

type EntitySettingsCardProps = {
  name: string;
  slug: string;
  singularLabel: string;
  pluralLabel: string;
  description?: string;
  icon?: string;
  color?: string;
  systemCategory?: string;
  defaultView: 'table' | 'list' | 'card';
  enabled: boolean;
  onNameChange: (name: string) => void;
  onSingularLabelChange: (value: string) => void;
  onPluralLabelChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onSystemCategoryChange: (value: string) => void;
  onDefaultViewChange: (value: 'table' | 'list' | 'card') => void;
  onEnabledChange: (enabled: boolean) => void;
};

export function EntitySettingsCard({
  name,
  slug,
  singularLabel,
  pluralLabel,
  description,
  icon,
  color,
  systemCategory,
  defaultView,
  enabled,
  onNameChange,
  onSingularLabelChange,
  onPluralLabelChange,
  onDescriptionChange,
  onIconChange,
  onColorChange,
  onSystemCategoryChange,
  onDefaultViewChange,
  onEnabledChange,
}: EntitySettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => onNameChange(e.target.value)} />
        </div>
        <div>
          <Label>Slug</Label>
          <Input value={slug} disabled className="bg-muted/50" />
        </div>
        <div>
          <Label>Singular label</Label>
          <Input value={singularLabel} onChange={(e) => onSingularLabelChange(e.target.value)} />
        </div>
        <div>
          <Label>Plural label</Label>
          <Input value={pluralLabel} onChange={(e) => onPluralLabelChange(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <Input value={description ?? ''} onChange={(e) => onDescriptionChange(e.target.value)} />
        </div>
        <div>
          <Label>Icon (Lucide name)</Label>
          <Input value={icon ?? ''} onChange={(e) => onIconChange(e.target.value)} placeholder="database" />
        </div>
        <div>
          <Label>Color</Label>
          <Input type="color" value={color ?? '#6366f1'} onChange={(e) => onColorChange(e.target.value)} />
        </div>
        <div>
          <Label>System category</Label>
          <Input
            value={systemCategory ?? ''}
            onChange={(e) => onSystemCategoryChange(e.target.value)}
            placeholder="operations, sales, support…"
          />
        </div>
        <div>
          <Label>Default view</Label>
          <Select
            value={defaultView}
            onChange={(e) => onDefaultViewChange(e.target.value as 'table' | 'list' | 'card')}
          >
            <option value="table">Table</option>
            <option value="list">List</option>
            <option value="card">Card</option>
          </Select>
        </div>
        <label className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm font-medium">Enabled</span>
          <input type="checkbox" checked={enabled} onChange={(e) => onEnabledChange(e.target.checked)} />
        </label>
      </CardContent>
    </Card>
  );
}
