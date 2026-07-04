'use client';

import { cn } from '@zodyk/shared-ui';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { groupSections, rebuildOrder, useCustomizerStore } from '../../store';
import type { SectionGroupName } from '../../store';
import { SectionItem } from './SectionItem';
import { VirtualList } from './VirtualList';

function AddSectionIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M4.25 8a.75.75 0 0 1 .75-.75h2.25v-2.25a.75.75 0 0 1 1.5 0v2.25h2.25a.75.75 0 0 1 0 1.5h-2.25v2.25a.75.75 0 0 1-1.5 0v-2.25h-2.25a.75.75 0 0 1-.75-.75"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14m0-1.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 1 0 0 11"
      />
    </svg>
  );
}

interface SectionGroupProps {
  title: string;
  groupKey: SectionGroupName;
  sectionIds: string[];
  divided?: boolean;
}

export function SectionGroup({ title, groupKey, sectionIds, divided = false }: SectionGroupProps) {
  const { templateJson, reorderSections, pushHistory, openAddSectionDialog } = useCustomizerStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = sectionIds.indexOf(String(active.id));
    const newIndex = sectionIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nextGroup = [...sectionIds];
    const [moved] = nextGroup.splice(oldIndex, 1);
    nextGroup.splice(newIndex, 0, moved!);
    const { header, template, footer } = groupSections(templateJson);
    let order: string[];
    if (groupKey === 'header') order = rebuildOrder(nextGroup, template, footer);
    else if (groupKey === 'footer') order = rebuildOrder(header, template, nextGroup);
    else order = rebuildOrder(header, nextGroup, footer);
    pushHistory();
    reorderSections(order);
  }

  return (
    <div className={cn('mb-1 px-2', divided && 'border-t border-zinc-200 pt-2')}>
      <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-0.5" role="group" aria-label={title}>
            <VirtualList count={sectionIds.length}>
              {(index) => <SectionItem key={sectionIds[index]!} sectionId={sectionIds[index]!} />}
            </VirtualList>
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <div className="rounded bg-white px-2 py-1.5 text-sm shadow-md ring-1 ring-zinc-200">
              Dragging…
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <button
        type="button"
        className="mt-1 flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs font-medium text-blue-600 hover:text-blue-700"
        onClick={() => openAddSectionDialog(groupKey)}
      >
        <AddSectionIcon className="h-4 w-4 shrink-0" />
        Add section
      </button>
    </div>
  );
}
