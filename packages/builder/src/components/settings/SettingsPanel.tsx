'use client';

import { lazy, Suspense } from 'react';
import { Skeleton } from '@zodyk/shared-ui';
import { useCustomizerStore } from '../../store';
import { SettingsHeader } from './SettingsHeader';
import { SchemaSettingsList } from './SchemaSettingsList';
import { SettingsCollapsibleRow } from './SettingsCollapsibleRow';
import { RemoveSectionFooter } from './RemoveSectionFooter';

const CustomCssEditor = lazy(() =>
  import('./CustomCssEditor').then((m) => ({ default: m.CustomCssEditor })),
);

const SECTION_CUSTOM_CSS_ID = 'section-panel-custom-css';

export function SettingsPanel() {
  const {
    selectedSectionId,
    selectedBlockId,
    templateJson,
    sectionSchemas,
    updateSectionSettings,
    updateSectionCustomCss,
    updateBlockSettings,
    pushHistory,
    removeSection,
    removeBlock,
    duplicateSection,
    clearSelection,
    selectSection,
  } = useCustomizerStore();

  if (!selectedSectionId) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-zinc-400">
        Select a section to edit
      </div>
    );
  }

  const section = templateJson.sections[selectedSectionId];
  if (!section) return null;
  const schema = sectionSchemas[section.type];

  if (selectedBlockId) {
    const block = section.blocks?.[selectedBlockId];
    const blockDef = schema?.blocks?.find((b) => b.type === block?.type);
    if (!block || !blockDef) return null;

    return (
      <div className="flex h-full flex-col overflow-hidden">
        <SettingsHeader
          targetId={selectedBlockId}
          type={block.type}
          schemaName={blockDef.name}
          onClose={() => selectSection(selectedSectionId)}
          onRemove={() => {
            pushHistory();
            removeBlock(selectedSectionId, selectedBlockId);
            selectSection(selectedSectionId);
          }}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SchemaSettingsList
            settings={blockDef.settings}
            getValue={(id) => block.settings[id]}
            onChange={(id, value) => {
              pushHistory();
              updateBlockSettings(selectedSectionId, selectedBlockId, { [id]: value });
            }}
          />
        </div>
      </div>
    );
  }

  const sectionCustomCss =
    section.custom_css ?? (typeof section.settings.custom_css === 'string' ? section.settings.custom_css : '');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SettingsHeader
        targetId={selectedSectionId}
        type={section.type}
        category={schema?.category}
        schemaName={schema?.name ?? section.type}
        onClose={clearSelection}
        onDuplicate={() => {
          pushHistory();
          const id = duplicateSection(selectedSectionId);
          if (id) selectSection(id);
        }}
        showRemoveInMenu={false}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <SchemaSettingsList
          settings={schema?.settings ?? []}
          getValue={(id) => section.settings[id]}
          onChange={(id, value) => {
            pushHistory();
            updateSectionSettings(selectedSectionId, { [id]: value });
          }}
        />

        <SettingsCollapsibleRow id={SECTION_CUSTOM_CSS_ID} title="Custom CSS">
          <div className="px-4 py-3">
            <Suspense fallback={<Skeleton className="h-32 w-full" />}>
              <CustomCssEditor
                rows={8}
                placeholder="Add section-scoped CSS…"
                value={sectionCustomCss}
                onChange={(next: string) => {
                  pushHistory();
                  updateSectionCustomCss(selectedSectionId, next);
                }}
              />
            </Suspense>
          </div>
        </SettingsCollapsibleRow>

        <RemoveSectionFooter
          onRemove={() => {
            pushHistory();
            removeSection(selectedSectionId);
          }}
        />
      </div>
    </div>
  );
}
