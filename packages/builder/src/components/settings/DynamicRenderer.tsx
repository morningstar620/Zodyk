'use client';

import type { SectionSetting } from '@zodyk/core';
import { SettingControlFactory } from './SettingControlFactory';

interface DynamicRendererProps {
  settings: SectionSetting[];
  getValue: (settingId: string) => unknown;
  onChange: (settingId: string, value: unknown) => void;
}

export function DynamicRenderer({ settings, getValue, onChange }: DynamicRendererProps) {
  return (
    <>
      {settings.map((setting) => {
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
    </>
  );
}
