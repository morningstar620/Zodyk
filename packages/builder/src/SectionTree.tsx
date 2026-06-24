'use client';

import React, { useState } from 'react';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { groupSections, useCustomizerStore } from './store';

function SortableSectionItem({
  sectionId,
  label,
  selected,
  onSelect,
}: {
  sectionId: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sectionId });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
        selected ? 'bg-blue-50 text-blue-700' : 'text-zinc-700 hover:bg-zinc-100'
      }`}
      onClick={onSelect}
    >
      <span {...attributes} {...listeners} className="cursor-grab text-zinc-400">
        ⋮⋮
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function SectionGroup({
  title,
  sectionIds,
  allOrder,
  onReorder,
}: {
  title: string;
  sectionIds: string[];
  allOrder: string[];
  onReorder: (order: string[]) => void;
}) {
  const { templateJson, sectionSchemas, selectedSectionId, selectSection } = useCustomizerStore();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const groupIndex = (id: string) => sectionIds.indexOf(id);
    const oldIndex = groupIndex(String(active.id));
    const newIndex = groupIndex(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nextGroup = [...sectionIds];
    const [moved] = nextGroup.splice(oldIndex, 1);
    nextGroup.splice(newIndex, 0, moved!);
    const header = groupSections(templateJson).header;
    const footer = groupSections(templateJson).footer;
    const template = groupSections(templateJson).template;
    let order: string[];
    if (title === 'Header') order = [...nextGroup, ...template, ...footer];
    else if (title === 'Footer') order = [...header, ...template, ...nextGroup];
    else order = [...header, ...nextGroup, ...footer];
    onReorder(order);
  }

  if (sectionIds.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-0.5">
            {sectionIds.map((sectionId) => {
              const section = templateJson.sections[sectionId];
              const schema = section ? sectionSchemas[section.type] : undefined;
              const label = schema?.name ?? section?.type ?? sectionId;
              return (
                <SortableSectionItem
                  key={sectionId}
                  sectionId={sectionId}
                  label={label}
                  selected={selectedSectionId === sectionId}
                  onSelect={() => selectSection(sectionId)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export function SectionTree() {
  const { templateJson, sectionSchemas, reorderSections, addSection, pushHistory } = useCustomizerStore();
  const groups = groupSections(templateJson);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <SectionGroup
        title="Header"
        sectionIds={groups.header}
        allOrder={templateJson.order}
        onReorder={(order) => {
          pushHistory();
          reorderSections(order);
        }}
      />
      <SectionGroup
        title="Template"
        sectionIds={groups.template}
        allOrder={templateJson.order}
        onReorder={(order) => {
          pushHistory();
          reorderSections(order);
        }}
      />
      <SectionGroup
        title="Footer"
        sectionIds={groups.footer}
        allOrder={templateJson.order}
        onReorder={(order) => {
          pushHistory();
          reorderSections(order);
        }}
      />

      <div className="mt-auto border-t border-zinc-200 p-2">
        <button
          type="button"
          className="w-full rounded border border-dashed border-zinc-300 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          onClick={() => setShowAdd((v) => !v)}
        >
          + Add section
        </button>
        {showAdd && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded border border-zinc-200 bg-white">
            {Object.entries(sectionSchemas).map(([type, schema]) => (
              <button
                key={type}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                onClick={() => {
                  pushHistory();
                  addSection(type);
                  setShowAdd(false);
                }}
              >
                {schema.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}