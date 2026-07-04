import type { MetaFieldType } from '@zodyk/core';
import {
  Calendar,
  Code,
  FileJson,
  FileText,
  Hash,
  Image,
  Images,
  Link2,
  List,
  Paperclip,
  ToggleLeft,
  Type,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const FIELD_TYPE_ICONS: Record<MetaFieldType, LucideIcon> = {
  text: Type,
  rich_text: FileText,
  number: Hash,
  boolean: ToggleLeft,
  date: Calendar,
  datetime: Calendar,
  url: Link2,
  code: Code,
  json: FileJson,
  image: Image,
  gallery: Images,
  file: Paperclip,
  relation: List,
  entity_reference: Link2,
  repeater: List,
};

export function getFieldTypeIcon(type: MetaFieldType): LucideIcon {
  return FIELD_TYPE_ICONS[type] ?? Type;
}

export function formatFieldTypeLabel(
  type: MetaFieldType,
  settings?: { relation?: { targetSlug: string; cardinality?: string } },
): string {
  const labels: Record<MetaFieldType, string> = {
    text: 'Text',
    rich_text: 'Rich text',
    number: 'Number',
    boolean: 'Boolean',
    date: 'Date',
    datetime: 'Date',
    url: 'URL',
    code: 'Code',
    json: 'JSON',
    image: 'Image',
    gallery: 'Image · Multi',
    file: 'File',
    relation: 'Relation',
    entity_reference: 'Entity Reference',
    repeater: 'Repeater',
  };

  if (type === 'relation' && settings?.relation?.targetSlug) {
    const target = settings.relation.targetSlug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    return `Relation → ${target}`;
  }

  return labels[type] ?? type;
}
