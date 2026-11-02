'use client';

import type { MetaFieldDefinition } from '@zodyk/core';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import { cn } from '@zodyk/shared-ui';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { EntityTargetOption } from '@/components/content/entity-targets';
import { FieldEditor } from './field-editor';
import { formatFieldTypeLabel, getFieldTypeIcon } from './field-type-utils';

type MetaFieldsListProps = {
  groupKey: string;
  title?: string;
  fields: MetaFieldDefinition[];
  onChange: (fields: MetaFieldDefinition[]) => void;
  entityTargets?: EntityTargetOption[];
};

export function MetaFieldsList({
  groupKey,
  title = 'Fields',
  fields,
  onChange,
  entityTargets,
}: MetaFieldsListProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const groupFields = fields
    .filter((field) => field.group === groupKey && !field.isSystem)
    .sort((a, b) => a.order - b.order);

  const updateField = (key: string, patch: Partial<MetaFieldDefinition>) => {
    onChange(fields.map((field) => (field.key === key ? { ...field, ...patch } : field)));
    if (patch.key && patch.key !== key && selectedKey === key) setSelectedKey(patch.key);
  };

  const addField = () => {
    const taken = new Set(fields.map((field) => field.key));
    let n = groupFields.length + 1;
    let key = `field_${n}`;
    while (taken.has(key)) {
      n += 1;
      key = `field_${n}`;
    }
    const newField: MetaFieldDefinition = {
      key,
      group: groupKey,
      label: 'New Field',
      type: 'text',
      required: false,
      localized: false,
      order: groupFields.length,
    };
    onChange([...fields, newField]);
    setSelectedKey(key);
  };

  const removeField = (key: string) => {
    onChange(fields.filter((field) => field.key !== key));
    if (selectedKey === key) setSelectedKey(null);
  };

  const moveField = (key: string, direction: -1 | 1) => {
    const sorted = [...groupFields];
    const index = sorted.findIndex((field) => field.key === key);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;
    onChange(applyGroupOrder(fields, arrayMove(sorted, index, swapIndex)));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = groupFields.findIndex((field) => field.key === active.id);
    const newIndex = groupFields.findIndex((field) => field.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(applyGroupOrder(fields, arrayMove(groupFields, oldIndex, newIndex)));
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">Drag to reorder. Click a field to edit.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={groupFields.map((field) => field.key)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y divide-border rounded-lg border border-border">
              {groupFields.map((field) => (
                <SortableFieldRow
                  key={field.key}
                  field={field}
                  selected={selectedKey === field.key}
                  onToggle={() => setSelectedKey(selectedKey === field.key ? null : field.key)}
                >
                  <FieldEditor
                    field={field}
                    fields={fields.filter((item) => !item.isSystem)}
                    entityTargets={entityTargets}
                    onChange={(patch) => updateField(field.key, patch)}
                    onMoveUp={() => moveField(field.key, -1)}
                    onMoveDown={() => moveField(field.key, 1)}
                    onRemove={() => removeField(field.key)}
                  />
                </SortableFieldRow>
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <Button type="button" variant="outline" className="w-full" onClick={addField}>
          <Plus className="h-4 w-4" />
          Add field
        </Button>
      </CardContent>
    </Card>
  );
}

function applyGroupOrder(fields: MetaFieldDefinition[], ordered: MetaFieldDefinition[]) {
  const order = new Map(ordered.map((field, index) => [field.key, index]));
  return fields.map((field) =>
    order.has(field.key) ? { ...field, order: order.get(field.key)! } : field,
  );
}

function SortableFieldRow({
  field,
  selected,
  onToggle,
  children,
}: {
  field: MetaFieldDefinition;
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.key,
  });
  const Icon = getFieldTypeIcon(field.type);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'z-10 bg-card opacity-80')}
    >
      <div
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
          selected ? 'bg-muted/60' : 'hover:bg-muted/30',
        )}
      >
        <button
          type="button"
          className="cursor-grab text-muted-foreground/50 active:cursor-grabbing"
          aria-label={`Drag to reorder ${field.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{field.label}</span>
              {field.required && (
                <Badge variant="destructive" className="text-[10px]">
                  required
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{field.key}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatFieldTypeLabel(field.type, field.settings)}
          </span>
        </button>
      </div>
      {selected && <div className="border-t border-border bg-muted/20 px-4 py-4">{children}</div>}
    </li>
  );
}
