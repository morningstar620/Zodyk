import type { MenuItemType } from '@zodyk/core';

export interface MenuItemNode {
  id: string;
  label: string;
  url: string;
  type: MenuItemType;
  resourceId?: string;
  resourceHandle?: string;
  metaType?: string;
  items: MenuItemNode[];
  collapsed?: boolean;
  editing?: boolean;
}

export interface MenuFormData {
  title: string;
  handle: string;
  items: MenuItemNode[];
}

export interface MenuRecord {
  id: string;
  title: string;
  handle: string;
  items: MenuItemNode[];
  createdAt?: string;
  updatedAt?: string;
}

export function titleToHandle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function defaultMenuFormData(): MenuFormData {
  return {
    title: '',
    handle: '',
    items: [],
  };
}

export function menuToFormData(menu: MenuRecord): MenuFormData {
  return {
    title: menu.title,
    handle: menu.handle,
    items: normalizeMenuItems(menu.items ?? []),
  };
}

function normalizeMenuItems(items: MenuItemNode[]): MenuItemNode[] {
  return items.map((item) => ({
    id: item.id ?? crypto.randomUUID(),
    label: item.label ?? '',
    url: item.url ?? '',
    type: item.type ?? 'http',
    resourceId: item.resourceId,
    resourceHandle: item.resourceHandle,
    metaType: item.metaType,
    items: normalizeMenuItems(item.items ?? []),
    collapsed: item.collapsed ?? true,
    editing: false,
  }));
}

export function createEmptyMenuItem(): MenuItemNode {
  return {
    id: crypto.randomUUID(),
    label: '',
    url: '',
    type: 'http',
    items: [],
    collapsed: false,
    editing: true,
  };
}

export function countMenuItems(items: MenuItemNode[]): number {
  return items.reduce((sum, item) => sum + 1 + countMenuItems(item.items ?? []), 0);
}

export function stripUiState(items: MenuItemNode[]): MenuItemNode[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    url: item.url,
    type: item.type,
    resourceId: item.resourceId,
    resourceHandle: item.resourceHandle,
    metaType: item.metaType,
    items: stripUiState(item.items ?? []),
  }));
}
