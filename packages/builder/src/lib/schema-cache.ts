import type { SectionDefinition, SectionSetting } from '@zodyk/core';
import { isInputSetting } from '@zodyk/core';

export interface SettingGroup {
  id: string;
  label: string;
  settings: SectionSetting[];
}

const groupCache = new Map<string, SettingGroup[]>();

export function getSettingGroups(schema: SectionDefinition | undefined): SettingGroup[] {
  if (!schema) return [];
  const key = `${schema.name}:${schema.settings.length}`;
  const cached = groupCache.get(key);
  if (cached) return cached;

  const groups: SettingGroup[] = [];
  let current: SettingGroup = { id: '__default', label: 'Settings', settings: [] };

  for (const setting of schema.settings) {
    if (setting.type === 'header') {
      if (current.settings.length > 0) groups.push(current);
      current = {
        id: setting.id ?? `header-${groups.length}`,
        label: setting.content ?? setting.label ?? 'Settings',
        settings: [],
      };
    } else if (setting.type === 'paragraph') {
      continue;
    } else if (isInputSetting(setting.type)) {
      current.settings.push(setting);
    }
  }

  if (current.settings.length > 0) groups.push(current);
  if (groups.length === 0 && schema.settings.some((s) => isInputSetting(s.type))) {
    groups.push({
      id: '__default',
      label: 'Settings',
      settings: schema.settings.filter((s) => isInputSetting(s.type)),
    });
  }

  groupCache.set(key, groups);
  return groups;
}

export function getBlockSettingGroups(
  blockSettings: SectionSetting[],
  blockName: string,
): SettingGroup[] {
  const fakeSchema: SectionDefinition = {
    name: blockName,
    tag: 'div',
    settings: blockSettings,
    blocks: [],
    presets: [],
  };
  return getSettingGroups(fakeSchema);
}
