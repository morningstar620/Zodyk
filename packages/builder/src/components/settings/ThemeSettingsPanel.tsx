'use client';

import { cn } from '@zodyk/shared-ui';
import { ChevronDown } from 'lucide-react';
import { useCustomizerStore } from '../../store';
import { DynamicRenderer } from './DynamicRenderer';

export function ThemeSettingsPanel() {
  const {
    settingsSchema,
    themeSettings,
    setThemeSettings,
    pushHistory,
    isAccordionExpanded,
    toggleAccordion,
  } = useCustomizerStore();

  const groups = settingsSchema.map((group, index) => ({
    id: `theme-${index}`,
    label: group.name,
    settings: group.settings,
  }));

  const hasSchema = settingsSchema.length > 0 && settingsSchema.some((g) => g.settings.length > 0);

  if (!hasSchema) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-medium text-zinc-700">No theme settings available</p>
        <p className="mt-1 text-xs text-zinc-500">
          This theme does not define global settings in{' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5">config/settings_schema.json</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400">No matching settings</p>
        ) : (
          <div className="divide-y divide-zinc-200">
            {groups.map((group, index) => {
              const expanded = isAccordionExpanded(group.id, index === 0);
              return (
                <div key={group.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-50',
                      expanded && 'bg-zinc-50',
                    )}
                    onClick={() => toggleAccordion(group.id)}
                    aria-expanded={expanded}
                  >
                    {group.label}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-zinc-400 transition-transform',
                        expanded && 'rotate-180',
                      )}
                    />
                  </button>
                  {expanded && (
                    <div className="flex flex-col gap-4 border-t border-zinc-100 bg-white px-4 py-4">
                      <DynamicRenderer
                        settings={group.settings}
                        getValue={(id) => themeSettings[id]}
                        onChange={(id, value) => {
                          pushHistory();
                          setThemeSettings({ ...themeSettings, [id]: value });
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
