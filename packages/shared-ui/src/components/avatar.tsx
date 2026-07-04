import * as React from 'react';

import { cn } from '../lib/utils';

export const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-primary text-primary-foreground',
        className,
      )}
      {...props}
    />
  ),
);
Avatar.displayName = 'Avatar';

export const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex h-full w-full items-center justify-center text-xs font-medium', className)}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';
