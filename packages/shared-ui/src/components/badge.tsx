import { cn } from '../lib/utils';
import type { HTMLAttributes } from 'react';

export function Badge({ className, variant = 'default', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'success' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-zinc-900 text-zinc-50',
        variant === 'secondary' && 'bg-zinc-100 text-zinc-900',
        variant === 'destructive' && 'bg-red-100 text-red-800',
        variant === 'success' && 'bg-green-100 text-green-800',
        className,
      )}
      {...props}
    />
  );
}
