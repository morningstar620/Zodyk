import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@zodyk/shared-ui';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageBreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function PageBreadcrumbs({ items, className }: PageBreadcrumbsProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className={index === items.length - 1 ? 'text-foreground' : undefined}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
