'use client';

import { cn } from '@zodyk/shared-ui';
import { useCustomizerStore } from '../../store';

export function SyncProgressBar() {
  const { syncState, syncProgress } = useCustomizerStore();

  const isActive = syncState !== 'idle';
  const isError = syncState === 'error';
  const isSaved = syncState === 'saved';
  const isDeterminate = syncProgress !== null && syncState === 'syncing';

  return (
    <div
      className={cn(
        'relative h-0.5 w-full shrink-0 overflow-hidden',
        isActive ? 'bg-zinc-200' : 'bg-transparent',
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isDeterminate ? syncProgress ?? 0 : undefined}
      aria-busy={syncState === 'pending' || syncState === 'syncing'}
      aria-hidden={!isActive}
    >
      {isActive &&
        (isDeterminate ? (
          <div
            className={cn(
              'h-full transition-[width] duration-300 ease-out',
              isError ? 'bg-red-500' : isSaved ? 'bg-emerald-500' : 'bg-blue-500',
            )}
            style={{ width: `${syncProgress ?? 0}%` }}
          />
        ) : (
          <div
            className={cn(
              'zodyk-sync-indeterminate h-full w-2/5',
              isError ? 'bg-red-500' : isSaved ? 'bg-emerald-500' : 'bg-blue-500',
            )}
          />
        ))}
    </div>
  );
}
