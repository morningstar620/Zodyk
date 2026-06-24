import { cn } from '../lib/utils';
import type { InputHTMLAttributes } from 'react';

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950',
        className,
      )}
      {...props}
    />
  );
}
