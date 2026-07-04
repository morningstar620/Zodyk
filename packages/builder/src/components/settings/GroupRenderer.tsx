'use client';

import { cn } from '@zodyk/shared-ui';
import { ChevronDown } from 'lucide-react';
import type { SettingGroup } from '../../lib/schema-cache';
import { useCustomizerStore } from '../../store';
import { DynamicRenderer } from './DynamicRenderer';

interface GroupRendererProps {
  groups: SettingGroup[];
  getValue: (settingId: string) => unknown;
  onChange: (settingId: string, value: unknown) => void;
  searchQuery?: string;
}

export function GroupRenderer({ groups, getValue, onChange, searchQuery = '' }: GroupRendererProps) {
  const { isAccordionExpanded, toggleAccordion } = useCustomizerStore();
  const q = searchQuery.toLowerCase().trim();

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      settings: q
        ? group.settings.filter(
            (s) =>
              s.label?.toLowerCase().includes(q) ||
              s.id?.toLowerCase().includes(q) ||
              s.type.toLowerCase().includes(q),
          )
        : group.settings,
    }))
    .filter((g) => g.settings.length > 0);

  if (visibleGroups.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-zinc-400">
        {q ? 'No matching settings' : 'No settings for this section'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 pb-4">
      {visibleGroups.map((group, index) => {
        const expanded = isAccordionExpanded(group.id, index === 0);
        return (
          <div key={group.id} className="rounded-md border border-zinc-200">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase text-zinc-600 hover:bg-zinc-50"
              onClick={() => toggleAccordion(group.id)}
              aria-expanded={expanded}
            >
              {group.label}
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
              />
            </button>
            {expanded && (
              <div className="flex flex-col gap-4 border-t border-zinc-100 px-3 py-3">
                <DynamicRenderer settings={group.settings} getValue={getValue} onChange={onChange} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
