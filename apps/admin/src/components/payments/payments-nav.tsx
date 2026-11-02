'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/payments', label: 'Ledger' },
  { href: '/payments/subscriptions', label: 'Subscriptions' },
  { href: '/payments/products', label: 'Products' },
  { href: '/payments/events', label: 'Webhooks' },
];

export function PaymentsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? 'rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white'
                : 'rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50'
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}
