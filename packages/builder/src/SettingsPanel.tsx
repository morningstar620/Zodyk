'use client';

import { SectionSettingField } from './SectionSettingField';
import { useCustomizerStore } from './store';

export function SettingsPanel() {
  const {
    mode,
    selectedSectionId,
    templateJson,
    sectionSchemas,
    settingsSchema,
    themeSettings,
    updateSectionSettings,
    setThemeSettings,
    pushHistory,
    removeSection,
  } = useCustomizerStore();

  if (mode === 'theme_settings') {
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Theme settings</h2>
        {settingsSchema.map((group) => (
          <div key={group.name} className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase text-zinc-500">{group.name}</h3>
            {group.settings.map((setting) => (
              <SectionSettingField
                key={setting.id}
                setting={setting}
                value={themeSettings[setting.id] ?? setting.default}
                onChange={(value) => {
                  pushHistory();
                  setThemeSettings({ ...themeSettings, [setting.id]: value });
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!selectedSectionId) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-zinc-500">
        Select a section to edit its settings
      </div>
    );
  }

  const section = templateJson.sections[selectedSectionId];
  if (!section) return null;
  const schema = sectionSchemas[section.type];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">{schema?.name ?? section.type}</h2>
        <button
          type="button"
          className="text-xs text-red-600 hover:underline"
          onClick={() => {
            pushHistory();
            removeSection(selectedSectionId);
          }}
        >
          Remove
        </button>
      </div>
      <div className="flex flex-col gap-4 p-4">
        {(schema?.settings ?? []).map((setting) => (
          <SectionSettingField
            key={setting.id}
            setting={setting}
            value={section.settings[setting.id] ?? setting.default}
            onChange={(value) => {
              pushHistory();
              updateSectionSettings(selectedSectionId, { [setting.id]: value });
            }}
          />
        ))}
      </div>
    </div>
  );
}
