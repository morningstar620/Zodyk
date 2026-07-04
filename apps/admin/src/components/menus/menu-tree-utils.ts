import type { MenuItemNode } from './menu-types';

export const INDENTATION_WIDTH = 28;
export const MAX_MENU_DEPTH = 3;

export interface FlatMenuItem extends MenuItemNode {
  depth: number;
  parentId: string | null;
}

export function flattenTree(
  items: MenuItemNode[],
  parentId: string | null = null,
  depth = 1,
): FlatMenuItem[] {
  const result: FlatMenuItem[] = [];
  for (const item of items) {
    result.push({
      ...item,
      depth,
      parentId,
    });
    if (item.items?.length && !item.collapsed) {
      result.push(...flattenTree(item.items, item.id, depth + 1));
    }
  }
  return result;
}

export function flattenTreeFull(
  items: MenuItemNode[],
  parentId: string | null = null,
  depth = 1,
): FlatMenuItem[] {
  const result: FlatMenuItem[] = [];
  for (const item of items) {
    result.push({ ...item, depth, parentId });
    if (item.items?.length) {
      result.push(...flattenTreeFull(item.items, item.id, depth + 1));
    }
  }
  return result;
}

export function buildTree(flatItems: FlatMenuItem[]): MenuItemNode[] {
  const roots: MenuItemNode[] = [];
  const stack: MenuItemNode[] = [];

  for (const flat of flatItems) {
    const node: MenuItemNode = {
      id: flat.id,
      label: flat.label,
      url: flat.url,
      type: flat.type,
      resourceId: flat.resourceId,
      resourceHandle: flat.resourceHandle,
      metaType: flat.metaType,
      items: [],
      collapsed: flat.collapsed,
      editing: flat.editing,
    };

    while (stack.length >= flat.depth) {
      stack.pop();
    }

    if (flat.depth === 1) {
      roots.push(node);
    } else {
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.items.push(node);
      }
    }

    stack.push(node);
  }

  return roots;
}

export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const next = [...array];
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(to, 0, item);
  return next;
}

export function getProjection(
  items: FlatMenuItem[],
  activeId: string,
  overId: string,
  dragOffset: number,
): { depth: number; parentId: string | null } {
  const overIndex = items.findIndex(({ id }) => id === overId);
  const activeIndex = items.findIndex(({ id }) => id === activeId);
  const activeItem = items[activeIndex];
  if (!activeItem) return { depth: 1, parentId: null };

  const dragDepth = Math.round(dragOffset / INDENTATION_WIDTH);
  const projectedDepth = activeItem.depth + dragDepth;

  const reordered = arrayMove(items, activeIndex, overIndex);
  const previousItem = reordered[overIndex - 1];
  const nextItem = reordered[overIndex + 1];

  let maxDepth = MAX_MENU_DEPTH;
  let minDepth = 1;

  if (previousItem) {
    if (previousItem.depth === MAX_MENU_DEPTH) {
      minDepth = MAX_MENU_DEPTH;
      maxDepth = MAX_MENU_DEPTH;
    } else {
      minDepth = previousItem.depth;
      maxDepth = previousItem.depth + 1;
    }
  }

  if (nextItem) {
    maxDepth = Math.min(maxDepth, nextItem.depth);
  }

  const depth = Math.max(minDepth, Math.min(projectedDepth, maxDepth));

  function getParentId(): string | null {
    if (depth === 1) return null;
    if (!previousItem) return null;
    if (depth === previousItem.depth) return previousItem.parentId;
    if (depth > previousItem.depth) return previousItem.id;

    const newParent = reordered
      .slice(0, overIndex)
      .reverse()
      .find((item) => item.depth === depth - 1);
    return newParent?.id ?? null;
  }

  return { depth, parentId: getParentId() };
}

export function setCollapsed(items: MenuItemNode[], id: string, collapsed: boolean): MenuItemNode[] {
  return items.map((item) => {
    if (item.id === id) return { ...item, collapsed };
    if (item.items.length) {
      return { ...item, items: setCollapsed(item.items, id, collapsed) };
    }
    return item;
  });
}

export function updateItem(
  items: MenuItemNode[],
  id: string,
  patch: Partial<MenuItemNode>,
): MenuItemNode[] {
  return items.map((item) => {
    if (item.id === id) return { ...item, ...patch };
    if (item.items.length) {
      return { ...item, items: updateItem(item.items, id, patch) };
    }
    return item;
  });
}

export function removeItem(items: MenuItemNode[], id: string): MenuItemNode[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      items: removeItem(item.items, id),
    }));
}

export function addChildItem(
  items: MenuItemNode[],
  parentId: string | null,
  newItem: MenuItemNode,
): MenuItemNode[] {
  if (!parentId) {
    return [...items, newItem];
  }
  return items.map((item) => {
    if (item.id === parentId) {
      return {
        ...item,
        collapsed: false,
        items: [...item.items, newItem],
      };
    }
    if (item.items.length) {
      return { ...item, items: addChildItem(item.items, parentId, newItem) };
    }
    return item;
  });
}

export function findItem(items: MenuItemNode[], id: string): MenuItemNode | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findItem(item.items, id);
    if (found) return found;
  }
  return undefined;
}
