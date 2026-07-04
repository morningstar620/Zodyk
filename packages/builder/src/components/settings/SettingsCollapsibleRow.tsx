'use client';

import { cn } from '@zodyk/shared-ui';
import { ChevronDown } from 'lucide-react';
import { useCustomizerStore } from '../../store';

interface SettingsCollapsibleRowProps {
  id: string;
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function SettingsCollapsibleRow({
  id,
  title,
  defaultExpanded = false,
  children,
}: SettingsCollapsibleRowProps) {
  const { isAccordionExpanded, toggleAccordion } = useCustomizerStore();
  const expanded = isAccordionExpanded(id, defaultExpanded);

  return (
    <div className="border-t border-zinc-200">
      <button
        type="button"
        className={cn(
          'flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-50',
          expanded && 'bg-zinc-50',
        )}
        onClick={() => toggleAccordion(id)}
        aria-expanded={expanded}
      >
        {title}
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-zinc-400 transition-transform', expanded && 'rotate-180')}
        />
      </button>
      {expanded && <div className="border-t border-zinc-100 bg-white">{children}</div>}
    </div>
  );
}
