'use client';

import { cn } from '@zodyk/shared-ui';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Trash2,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { getSectionIcon } from '../../lib/section-icons';
import { useCustomizerStore } from '../../store';
import { BlockItem } from './BlockItem';

interface SectionItemProps {
  sectionId: string;
}

export function SectionItem({ sectionId }: SectionItemProps) {
  const {
    templateJson,
    sectionSchemas,
    selectedSectionId,
    selectedBlockId,
    editorMeta,
    selectSection,
    setHoveredTarget,
    toggleSectionExpanded,
    isSectionExpanded,
    toggleSectionHidden,
    isSectionHidden,
    removeSection,
    pushHistory,
    reorderBlocks,
  } = useCustomizerStore();

  const section = templateJson.sections[sectionId];
  const schema = section ? sectionSchemas[section.type] : undefined;
  const displayName = editorMeta.displayNames[sectionId] ?? schema?.name ?? section?.type ?? sectionId;
  const Icon = getSectionIcon(section?.type ?? '', schema?.category);
  const selected = selectedSectionId === sectionId && !selectedBlockId;
  const expanded = isSectionExpanded(sectionId);
  const hidden = isSectionHidden(sectionId);
  const hasBlocks = (schema?.blocks?.length ?? 0) > 0;
  const blockOrder = section?.block_order ?? Object.keys(section?.blocks ?? {});

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionId,
  });

  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleBlockDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blockOrder.indexOf(String(active.id));
    const newIndex = blockOrder.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...blockOrder];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved!);
    pushHistory();
    reorderBlocks(sectionId, next);
  }

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div
        role="treeitem"
        aria-selected={selected}
        className={cn(
          'group flex items-center gap-1 rounded px-1 py-1 text-sm',
          selected ? 'bg-blue-600 text-white' : 'text-zinc-700 hover:bg-zinc-100',
          isDragging && 'opacity-50',
          hidden && 'opacity-50',
        )}
        onMouseEnter={() => setHoveredTarget({ sectionId })}
        onMouseLeave={() => setHoveredTarget(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          selectSection(sectionId);
        }}
      >
        <button
          type="button"
          className={cn(
            'cursor-grab touch-none p-0.5',
            selected ? 'text-blue-200' : 'text-zinc-400',
          )}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {hasBlocks ? (
          <button
            type="button"
            className="p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              toggleSectionExpanded(sectionId);
            }}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => selectSection(sectionId)}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{displayName}</span>
        </button>

        <div className="flex items-center opacity-0 group-hover:opacity-100">
          <button
            type="button"
            className={cn('rounded p-0.5', selected ? 'hover:bg-blue-500' : 'hover:bg-zinc-200')}
            onClick={(e) => {
              e.stopPropagation();
              toggleSectionHidden(sectionId);
            }}
            title={hidden ? 'Show section' : 'Hide section'}
          >
            {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            className={cn('rounded p-0.5', selected ? 'hover:bg-blue-500' : 'hover:bg-zinc-200')}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Remove this section?')) {
                pushHistory();
                removeSection(sectionId);
              }
            }}
            title="Remove section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {hasBlocks && expanded && (
        <div className="ml-6 border-l border-zinc-200 pl-2">
          <DndContext
            sensors={blockSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleBlockDragEnd}
          >
            <SortableContext items={blockOrder} strategy={verticalListSortingStrategy}>
              {blockOrder.map((blockId) => (
                <BlockItem key={blockId} sectionId={sectionId} blockId={blockId} />
              ))}
            </SortableContext>
          </DndContext>
          {schema?.blocks?.map((blockDef) => {
            const count = blockOrder.filter(
              (id) => section?.blocks?.[id]?.type === blockDef.type,
            ).length;
            const atLimit = blockDef.limit ? count >= blockDef.limit : false;
            const atMax = schema.max_blocks ? blockOrder.length >= schema.max_blocks : false;
            if (atLimit || atMax) return null;
            return (
              <button
                key={blockDef.type}
                type="button"
                className="mt-0.5 w-full py-1 text-left text-xs font-medium text-blue-600 hover:text-blue-700"
                onClick={() => {
                  pushHistory();
                  const id = useCustomizerStore.getState().addBlock(sectionId, blockDef.type);
                  if (id) selectSection(sectionId, id);
                }}
              >
                + Add {blockDef.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
