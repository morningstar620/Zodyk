'use client';

import { cn } from '@zodyk/shared-ui';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { prefetchApi } from '@/lib/api-fetcher';
import { favoriteItems, navGroups, type NavItem } from './nav-config';

function NavLink({
  item,
  active,
  nested = false,
}: {
  item: NavItem;
  active: boolean;
  nested?: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch
      onMouseEnter={() => item.prefetch && prefetchApi(item.prefetch)}
      onFocus={() => item.prefetch && prefetchApi(item.prefetch)}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
        nested && 'pl-9',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/80 hover:bg-muted hover:text-sidebar-foreground',
      )}
    >
      {!nested && <Icon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavItemWithChildren({ item, pathname }: { item: NavItem; pathname: string }) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive =
    item.href === '/'
      ? pathname === '/'
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const [expanded, setExpanded] = useState(isActive);

  if (!hasChildren) {
    return <NavLink item={item} active={isActive} />;
  }

  const Icon = item.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
          isActive
            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/80 hover:bg-muted hover:text-sidebar-foreground',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
        )}
      </button>
      {expanded && (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {item.children!.map((child) => {
            const childActive = pathname === child.href.split('?')[0];
            return (
              <Link
                key={child.href}
                href={child.href}
                prefetch
                className={cn(
                  'rounded-md py-1.5 pl-9 pr-2.5 text-sm transition-colors',
                  childActive
                    ? 'font-medium text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:text-sidebar-foreground',
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="py-2">
      <NavSection label="Favorites">
        {favoriteItems.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <NavLink key={item.href + item.label} item={item} active={active} />;
        })}
      </NavSection>

      {navGroups.map((group) => (
        <NavSection key={group.label} label={group.label}>
          {group.items.map((item) => (
            <NavItemWithChildren key={item.href + item.label} item={item} pathname={pathname} />
          ))}
        </NavSection>
      ))}
    </nav>
  );
}
