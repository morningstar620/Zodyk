import { cn } from '../lib/utils';
import type { HTMLAttributes } from 'react';

export function Alert({ className, variant = 'default', ...props }: HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' | 'success' }) {
  return (
    <div
      className={cn(
        'relative w-full rounded-lg border px-4 py-3 text-sm',
        variant === 'destructive' && 'border-red-200 bg-red-50 text-red-800',
        variant === 'success' && 'border-green-200 bg-green-50 text-green-800',
        variant === 'default' && 'border-zinc-200 bg-zinc-50 text-zinc-800',
        className,
      )}
      {...props}
    />
  );
}
