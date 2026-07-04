'use client';

import { cn } from '@zodyk/shared-ui';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Image } from 'lucide-react';
import { useCustomizerStore } from '../../store';

interface BlockItemProps {
  sectionId: string;
  blockId: string;
}

export function BlockItem({ sectionId, blockId }: BlockItemProps) {
  const {
    templateJson,
    sectionSchemas,
    selectedSectionId,
    selectedBlockId,
    editorMeta,
    selectBlock,
    setHoveredTarget,
    removeBlock,
    pushHistory,
  } = useCustomizerStore();

  const section = templateJson.sections[sectionId];
  const block = section?.blocks?.[blockId];
  const schema = section ? sectionSchemas[section.type] : undefined;
  const blockDef = schema?.blocks?.find((b) => b.type === block?.type);
  const displayName = editorMeta.displayNames[blockId];
  const previewSetting = blockDef?.settings?.find((s) => s.type === 'text' || s.type === 'textarea');
  const previewValue =
    previewSetting?.id && block?.settings?.[previewSetting.id]
      ? String(block.settings[previewSetting.id])
      : '';
  const label = displayName ?? (previewValue ? `${blockDef?.name} – ${previewValue}` : blockDef?.name ?? blockId);
  const selected = selectedSectionId === sectionId && selectedBlockId === blockId;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: blockId,
  });

  return (
    <div
      ref={setNodeRef}
      role="treeitem"
      aria-selected={selected}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-1 rounded px-1 py-1 text-xs',
        selected ? 'bg-blue-100 text-blue-900' : 'text-zinc-600 hover:bg-zinc-50',
        isDragging && 'opacity-50',
      )}
      onMouseEnter={() => setHoveredTarget({ sectionId, blockId })}
      onMouseLeave={() => setHoveredTarget(null)}
      onContextMenu={(e) => {
        e.preventDefault();
        selectBlock(sectionId, blockId);
      }}
    >
      <button
        type="button"
        className="cursor-grab touch-none p-0.5 text-zinc-400"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder block"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-1 text-left"
        onClick={() => selectBlock(sectionId, blockId)}
      >
        <Image className="h-3 w-3 shrink-0 text-zinc-400" />
        <span className="truncate">{label}</span>
      </button>
      <button
        type="button"
        className="hidden p-0.5 text-zinc-400 group-hover:block hover:text-red-600"
        onClick={() => {
          pushHistory();
          removeBlock(sectionId, blockId);
        }}
        title="Remove block"
      >
        ×
      </button>
    </div>
  );
}
