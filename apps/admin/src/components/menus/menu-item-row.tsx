'use client';

import { Button, cn, Input, Label } from '@zodyk/shared-ui';
import { useSortable } from '@dnd-kit/sortable';
import { Check, ChevronDown, ChevronRight, GripVertical, Trash2 } from 'lucide-react';
import { LinkSelector } from './link-selector';
import type { FlatMenuItem } from './menu-tree-utils';
import { INDENTATION_WIDTH } from './menu-tree-utils';
import type { MenuItemNode } from './menu-types';

type MenuItemRowProps = {
  item: FlatMenuItem;
  depth: number;
  projectedDepth?: number;
  isDragging?: boolean;
  overlay?: boolean;
  onUpdate: (id: string, patch: Partial<MenuItemNode>) => void;
  onConfirm: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (id: string) => void;
};

export function MenuItemRow({
  item,
  depth,
  projectedDepth,
  isDragging,
  overlay,
  onUpdate,
  onConfirm,
  onDelete,
  onToggleCollapse,
}: MenuItemRowProps) {
  const { attributes, listeners, setNodeRef, isDragging: sortableDragging } = useSortable({
    id: item.id,
  });

  const displayDepth = projectedDepth ?? depth;
  const isEditing = item.editing ?? false;
  const hasChildren = (item.items?.length ?? 0) > 0;
  const isCollapsed = item.collapsed ?? false;

  const style = overlay ? undefined : { marginLeft: `${(displayDepth - 1) * INDENTATION_WIDTH}px` };

  if (!isEditing && isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-2',
          (isDragging || sortableDragging) && 'opacity-50 shadow-lg',
        )}
      >
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleCollapse(item.id)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <button
          type="button"
          onClick={() => onUpdate(item.id, { editing: true, collapsed: false })}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
        >
          <span className="truncate font-medium">{item.label || 'Untitled'}</span>
          {item.url && (
            <span className="truncate text-xs text-muted-foreground">· {item.url}</span>
          )}
        </button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border border-border bg-card p-3',
        (isDragging || sortableDragging) && 'opacity-50 shadow-lg',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-2 cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`label-${item.id}`} className="text-xs text-muted-foreground">
              Label
            </Label>
            <Input
              id={`label-${item.id}`}
              value={item.label}
              onChange={(e) => onUpdate(item.id, { label: e.target.value })}
              placeholder="e.g., About us"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Link</Label>
            <div className="mt-1">
              <LinkSelector
                value={item.url}
                type={item.type}
                onChange={(selection) =>
                  onUpdate(item.id, {
                    url: selection.url,
                    type: selection.type,
                    resourceId: selection.resourceId,
                    resourceHandle: selection.resourceHandle,
                    metaType: selection.metaType,
                    ...(item.label.trim() ? {} : { label: selection.label }),
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 pt-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onConfirm(item.id)}
          >
            <Check className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}
