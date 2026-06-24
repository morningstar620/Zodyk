'use client';

import {
  collectConditionalRules,
  getVisibleFieldKeys,
  type ConditionalRule,
  type MetaFieldDefinition,
} from '@zodyk/core';
import { useMemo } from 'react';

interface ConditionalWrapperProps {
  field: MetaFieldDefinition;
  allFields: MetaFieldDefinition[];
  data: Record<string, unknown>;
  children: React.ReactNode;
}

export function ConditionalWrapper({ field, allFields, data, children }: ConditionalWrapperProps) {
  const visible = useMemo(() => {
    const rules = collectConditionalRules(allFields) as ConditionalRule[];
    const keys = allFields.map((f) => f.key);
    return getVisibleFieldKeys(keys, rules, data);
  }, [allFields, data]);

  if (!visible.has(field.key)) return null;
  return <>{children}</>;
}
