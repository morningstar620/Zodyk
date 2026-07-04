'use client';

import { useCustomizerStore } from '../../store';
import { groupSections } from '../../store';
import { SectionGroup } from './SectionGroup';

export function SectionTree() {
  const { templateJson } = useCustomizerStore();
  const groups = groupSections(templateJson);

  return (
    <div className="flex flex-col py-2" role="tree" aria-label="Page sections">
      <SectionGroup title="Header" groupKey="header" sectionIds={groups.header} />
      <SectionGroup
        title="Template"
        groupKey="template"
        sectionIds={groups.template}
        divided
      />
      <SectionGroup title="Footer" groupKey="footer" sectionIds={groups.footer} divided />
    </div>
  );
}
