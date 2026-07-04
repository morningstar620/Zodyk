export interface SystemEntityRow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  singularLabel: string;
  pluralLabel: string;
  enabled: boolean;
  systemCategory?: string;
  defaultView: 'table' | 'list' | 'card';
  status: string;
  fields: { key: string }[];
}

export interface SystemEntityDefinition extends SystemEntityRow {
  behaviors: Record<string, boolean>;
  fieldGroups: import('@zodyk/core').MetaFieldGroup[];
  fields: import('@zodyk/core').MetaFieldDefinition[];
  relationships: import('@zodyk/core').EntityRelationship[];
  display: {
    tableColumns: string[];
    defaultSort: string;
    pageSize: number;
  };
  isSystem: boolean;
}

export interface SystemRecordRow {
  id: string;
  entitySlug: string;
  status: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type EntityTarget = {
  slug: string;
  name: string;
  category: 'meta_object' | 'system';
};
