'use client';

import { Button } from '@zodyk/shared-ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { prefetchApi } from '@/lib/api-fetcher';
import { AdminLayoutSkeleton } from '@/components/skeletons';

const navItems = [
  { href: '/', label: 'Dashboard', prefetch: null },
  { href: '/pages', label: 'Pages', prefetch: '/api/v1/pages' },
  { href: '/meta-objects', label: 'Meta Objects', prefetch: '/api/v1/meta-objects' },
  { href: '/themes', label: 'Themes', prefetch: '/api/v1/themes' },
  { href: '/media', label: 'Media', prefetch: '/api/v1/media' },
  { href: '/users', label: 'Users', prefetch: '/api/v1/users' },
  { href: '/roles', label: 'Roles', prefetch: '/api/v1/roles' },
  { href: '/settings', label: 'Settings', prefetch: null },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status === 'loading') {
    return <AdminLayoutSkeleton />;
  }

  if (!session?.user) {
    return <AdminLayoutSkeleton />;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 p-6">
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-zinc-900">Zodyk Admin</h1>
          <p className="text-sm text-zinc-500">{session.user.name}</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => item.prefetch && prefetchApi(item.prefetch)}
                onFocus={() => item.prefetch && prefetchApi(item.prefetch)}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-zinc-900 font-medium text-white'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-8">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Sign out
          </Button>
        </div>
      </aside>
      <main className="admin-main flex-1 p-8">{children}</main>
    </div>
  );
}
