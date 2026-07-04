'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Fragment, useMemo, useRef, useState } from 'react';
import { MenuItemRow } from './menu-item-row';
import {
  INDENTATION_WIDTH,
  MAX_MENU_DEPTH,
  addChildItem,
  buildTree,
  flattenTree,
  flattenTreeFull,
  getProjection,
  removeItem,
  setCollapsed,
  updateItem,
} from './menu-tree-utils';
import { createEmptyMenuItem, type MenuItemNode } from './menu-types';

const RAIL_X = 13;

type MenuItemsTreeProps = {
  items: MenuItemNode[];
  onChange: (items: MenuItemNode[]) => void;
};

type RenderRow =
  | {
      kind: 'item';
      node: MenuItemNode;
      depth: number;
      ancestorLines: boolean[];
      continuesDown: boolean;
    }
  | {
      kind: 'add';
      parentId: string;
      label: string;
      depth: number;
      ancestorLines: boolean[];
    };

function buildRenderRows(
  nodes: MenuItemNode[],
  parentId: string | null,
  parentLabel: string | null,
  depth: number,
  ancestorLines: boolean[],
): RenderRow[] {
  const rows: RenderRow[] = [];
  const addPresent = depth >= 2 && depth <= MAX_MENU_DEPTH;
  const count = nodes.length;

  nodes.forEach((node, idx) => {
    const isLastItem = idx === count - 1;
    const continuesDown = !isLastItem || addPresent;
    rows.push({ kind: 'item', node, depth, ancestorLines, continuesDown });

    const expanded = !node.collapsed && node.items.length > 0 && depth < MAX_MENU_DEPTH;
    if (expanded) {
      const childAncestor = depth >= 2 ? [...ancestorLines, continuesDown] : ancestorLines;
      rows.push(...buildRenderRows(node.items, node.id, node.label, depth + 1, childAncestor));
    }
  });

  if (addPresent && parentId) {
    rows.push({
      kind: 'add',
      parentId,
      label: `Add menu item to ${parentLabel || 'Untitled'}`,
      depth,
      ancestorLines,
    });
  }

  return rows;
}

function GuideLines({
  depth,
  ancestorLines,
  continuesDown,
}: {
  depth: number;
  ancestorLines: boolean[];
  continuesDown: boolean;
}) {
  if (depth < 2) return null;

  const rails: React.ReactNode[] = [];

  for (let i = 0; i < depth - 2; i += 1) {
    if (ancestorLines[i]) {
      rails.push(
        <div
          key={`ancestor-${i}`}
          className="absolute w-px bg-border"
          style={{ left: i * INDENTATION_WIDTH + RAIL_X, top: -4, bottom: -4 }}
        />,
      );
    }
  }

  const gutterX = (depth - 2) * INDENTATION_WIDTH + RAIL_X;
  rails.push(
    <div
      key="corner"
      className="absolute rounded-bl-[7px] border-b border-l border-border"
      style={{ left: gutterX, top: -4, width: INDENTATION_WIDTH - RAIL_X, height: 'calc(50% + 4px)' }}
    />,
  );
  if (continuesDown) {
    rails.push(
      <div
        key="continue"
        className="absolute w-px bg-border"
        style={{ left: gutterX, top: '50%', bottom: -4 }}
      />,
    );
  }

  return <>{rails}</>;
}

function DropIndicator({ depth }: { depth: number }) {
  return (
    <div className="relative py-0.5" style={{ marginLeft: (depth - 1) * INDENTATION_WIDTH }}>
      <div className="h-0.5 rounded bg-blue-600" />
      <span className="absolute top-1/2 -left-1 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-blue-600 bg-background" />
    </div>
  );
}

function AddItemButton({
  label,
  onClick,
  indent = 0,
}: {
  label: string;
  onClick: () => void;
  indent?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ marginLeft: `${indent * INDENTATION_WIDTH}px` }}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
    >
      <Plus className="h-4 w-4 text-primary" />
      {label}
    </button>
  );
}

export function MenuItemsTree({ items, onChange }: MenuItemsTreeProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [projected, setProjected] = useState<{ depth: number; parentId: string | null } | null>(
    null,
  );
  const [dropTarget, setDropTarget] = useState<{
    overId: string;
    place: 'before' | 'after';
    depth: number;
  } | null>(null);
  const projectedRef = useRef<{ depth: number; parentId: string | null } | null>(null);
  const overIdRef = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const flatItems = useMemo(() => flattenTree(items), [items]);
  const renderRows = useMemo(
    () => buildRenderRows(items, null, null, 1, []),
    [items],
  );
  const sortableIds = useMemo(
    () => renderRows.filter((row) => row.kind === 'item').map((row) => (row as { node: MenuItemNode }).node.id),
    [renderRows],
  );
  const activeItem = activeId ? flatItems.find((item) => item.id === activeId) : null;

  function resetDragState() {
    setActiveId(null);
    setProjected(null);
    setDropTarget(null);
    projectedRef.current = null;
    overIdRef.current = null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setProjected(null);
    setDropTarget(null);
    projectedRef.current = null;
    overIdRef.current = String(event.active.id);
  }

  function handleDragMove(event: DragMoveEvent) {
    const { active, over, delta } = event;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const projection = getProjection(flatItems, activeIdStr, overIdStr, delta.x);
    setProjected(projection);
    projectedRef.current = projection;
    overIdRef.current = overIdStr;

    const activeIndex = flatItems.findIndex((item) => item.id === activeIdStr);
    const overIndex = flatItems.findIndex((item) => item.id === overIdStr);
    const overRow = flatItems[overIndex];
    if (!overRow) {
      setDropTarget(null);
      return;
    }
    let place: 'before' | 'after';
    if (projection.depth > overRow.depth) {
      place = 'after';
    } else {
      place = overIndex >= activeIndex ? 'after' : 'before';
    }
    setDropTarget({ overId: overIdStr, place, depth: projection.depth });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const projection = projectedRef.current;
    const activeIdStr = String(active.id);
    const overId = over ? String(over.id) : overIdRef.current;
    resetDragState();

    if (!overId || !projection) return;

    const full = flattenTreeFull(items);
    const activeIndex = full.findIndex((item) => item.id === activeIdStr);
    if (activeIndex < 0) return;

    const activeDepth = full[activeIndex]!.depth;

    let blockEnd = activeIndex + 1;
    while (blockEnd < full.length && full[blockEnd]!.depth > activeDepth) {
      blockEnd += 1;
    }
    const block = full.slice(activeIndex, blockEnd);
    const rest = [...full.slice(0, activeIndex), ...full.slice(blockEnd)];

    const blockMaxDepth = Math.max(...block.map((item) => item.depth));
    let targetDepth = projection.depth;
    if (blockMaxDepth + (targetDepth - activeDepth) > MAX_MENU_DEPTH) {
      targetDepth = MAX_MENU_DEPTH - (blockMaxDepth - activeDepth);
    }
    const delta = targetDepth - activeDepth;
    const adjustedBlock = block.map((item) => ({ ...item, depth: item.depth + delta }));

    const overInBlock = block.some((item) => item.id === overId);
    let insertPos: number;
    if (overInBlock) {
      insertPos = activeIndex;
    } else {
      const overIndexFull = full.findIndex((item) => item.id === overId);
      const draggingDown = overIndexFull > activeIndex;
      const overInRest = rest.findIndex((item) => item.id === overId);
      if (overInRest < 0) {
        insertPos = activeIndex;
      } else {
        insertPos = draggingDown ? overInRest + 1 : overInRest;
      }
    }

    rest.splice(insertPos, 0, ...adjustedBlock);
    onChange(buildTree(rest));
  }

  function handleDragCancel() {
    resetDragState();
  }

  function handleAdd(parentId: string | null) {
    onChange(addChildItem(items, parentId, createEmptyMenuItem()));
  }

  function handleUpdate(id: string, patch: Partial<MenuItemNode>) {
    onChange(updateItem(items, id, patch));
  }

  function handleConfirm(id: string) {
    onChange(
      updateItem(items, id, {
        editing: false,
        collapsed: true,
      }),
    );
  }

  function handleDelete(id: string) {
    onChange(removeItem(items, id));
  }

  function handleToggleCollapse(id: string) {
    const item = flatItems.find((i) => i.id === id);
    if (!item) return;
    onChange(setCollapsed(items, id, !item.collapsed));
  }

  return (
    <div className="flex flex-col gap-1">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {renderRows.map((row) => {
              if (row.kind === 'add') {
                return (
                  <div key={`add-${row.parentId}`} className="relative">
                    <GuideLines depth={row.depth} ancestorLines={row.ancestorLines} continuesDown={false} />
                    <AddItemButton
                      label={row.label}
                      indent={row.depth - 1}
                      onClick={() => handleAdd(row.parentId)}
                    />
                  </div>
                );
              }

              const { node } = row;
              const flat = { ...node, depth: row.depth, parentId: null };
              return (
                <Fragment key={node.id}>
                  {dropTarget?.overId === node.id && dropTarget.place === 'before' && (
                    <DropIndicator depth={dropTarget.depth} />
                  )}
                  <div className="relative">
                    <GuideLines
                      depth={row.depth}
                      ancestorLines={row.ancestorLines}
                      continuesDown={row.continuesDown}
                    />
                    <MenuItemRow
                      item={flat}
                      depth={row.depth}
                      projectedDepth={activeId === node.id && projected ? projected.depth : undefined}
                      isDragging={activeId === node.id}
                      onUpdate={handleUpdate}
                      onConfirm={handleConfirm}
                      onDelete={handleDelete}
                      onToggleCollapse={handleToggleCollapse}
                    />
                  </div>
                  {dropTarget?.overId === node.id && dropTarget.place === 'after' && (
                    <DropIndicator depth={dropTarget.depth} />
                  )}
                </Fragment>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem ? (
            <MenuItemRow
              item={activeItem}
              depth={1}
              overlay
              isDragging
              onUpdate={() => {}}
              onConfirm={() => {}}
              onDelete={() => {}}
              onToggleCollapse={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <AddItemButton label="Add menu item" onClick={() => handleAdd(null)} />
    </div>
  );
}
