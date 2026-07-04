import type { TemplateJson } from '@zodyk/core';

export function groupSections(template: TemplateJson) {
  const header: string[] = [];
  const footer: string[] = [];
  const templateSections: string[] = [];

  for (const id of template.order) {
    const section = template.sections[id];
    if (!section) continue;
    if (section.type === 'header') header.push(id);
    else if (section.type === 'footer') footer.push(id);
    else templateSections.push(id);
  }

  return { header, template: templateSections, footer };
}

export function rebuildOrder(
  header: string[],
  template: string[],
  footer: string[],
): string[] {
  return [...header, ...template, ...footer];
}
