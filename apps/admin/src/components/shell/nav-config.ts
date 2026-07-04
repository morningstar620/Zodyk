import type { LucideIcon } from 'lucide-react';
import {
  Box,
  Cog,
  FileText,
  FolderOpen,
  Home,
  Image,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Shapes,
  Users,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  prefetch?: string | null;
  children?: { href: string; label: string }[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const favoriteItems: NavItem[] = [
  { href: '/', label: 'Homepage', icon: Home, prefetch: null },
  { href: '/themes', label: 'Theme: Aurora', icon: Box, prefetch: '/api/v1/themes' },
];

export const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard, prefetch: null },
      { href: '/search', label: 'Search', icon: Search, prefetch: null },
    ],
  },
  {
    label: 'Content',
    items: [
      {
        href: '/pages',
        label: 'Pages',
        icon: FileText,
        prefetch: '/api/v1/pages',
        children: [
          { href: '/pages', label: 'All pages' },
          { href: '/pages?status=draft', label: 'Drafts' },
          { href: '/pages?status=scheduled', label: 'Scheduled' },
        ],
      },
      { href: '/meta-objects', label: 'Meta Objects', icon: Shapes, prefetch: '/api/v1/meta-objects' },
      { href: '/media', label: 'Media Library', icon: Image, prefetch: '/api/v1/media' },
      { href: '/menus', label: 'Menus', icon: Menu, prefetch: '/api/v1/menus' },
      { href: '/forms', label: 'Forms', icon: FolderOpen, prefetch: null },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        href: '/system-entities',
        label: 'System Entities',
        icon: Cog,
        prefetch: '/api/v1/system-entities',
      },
      { href: '/users', label: 'Users', icon: Users, prefetch: '/api/v1/users' },
      { href: '/settings', label: 'Settings', icon: Settings, prefetch: null },
    ],
  },
];

export function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  if (pathname === '/') {
    return [{ label: 'Workspace' }, { label: 'Dashboard' }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [{ label: 'Workspace', href: '/' }];

  const labelMap: Record<string, string> = {
    pages: 'Pages',
    'meta-objects': 'Meta Objects',
    'system-entities': 'System Entities',
    themes: 'Themes',
    media: 'Media Library',
    users: 'Users',
    roles: 'Roles',
    settings: 'Settings',
    menus: 'Menus',
    forms: 'Forms',
    search: 'Search',
    new: 'New',
  };

  let path = '';
  for (const segment of segments) {
    path += `/${segment}`;
    crumbs.push({
      label: labelMap[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1),
      href: path,
    });
  }

  return crumbs;
}
