'use client';

import type { SectionSetting } from '@zodyk/core';
import { isInputSetting } from '@zodyk/core';
import { SettingControlFactory } from './SettingControlFactory';

interface SchemaSettingsListProps {
  settings: SectionSetting[];
  getValue: (settingId: string) => unknown;
  onChange: (settingId: string, value: unknown) => void;
  excludeIds?: string[];
}

export function SchemaSettingsList({
  settings,
  getValue,
  onChange,
  excludeIds = ['custom_css'],
}: SchemaSettingsListProps) {
  const exclude = new Set(excludeIds);
  let seenHeader = false;

  const items = settings.filter((setting) => {
    if (setting.id && exclude.has(setting.id)) return false;
    if (setting.type === 'header' || setting.type === 'paragraph') return true;
    return setting.id && isInputSetting(setting.type);
  });

  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-zinc-400">No settings for this section</p>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {items.map((setting) => {
        if (setting.type === 'header') {
          const isFirst = !seenHeader;
          seenHeader = true;
          return (
            <div
              key={setting.id ?? setting.content ?? `header-${seenHeader}`}
              className={isFirst ? 'pt-0' : 'border-t border-zinc-200 pt-4'}
            >
              <p className="text-sm font-semibold text-zinc-900">
                {setting.content ?? setting.label ?? 'Settings'}
              </p>
            </div>
          );
        }

        if (setting.type === 'paragraph') {
          return (
            <p key={setting.id ?? setting.content} className="text-xs text-zinc-500">
              {setting.content ?? setting.label}
            </p>
          );
        }

        if (!setting.id) return null;

        return (
          <SettingControlFactory
            key={setting.id}
            setting={setting}
            value={getValue(setting.id) ?? setting.default}
            onChange={(value) => onChange(setting.id!, value)}
          />
        );
      })}
    </div>
  );
}
