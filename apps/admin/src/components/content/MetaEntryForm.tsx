'use client';

import {
  mergeLocalizedData,
  SEO_GROUP_KEY,
  type MetaFieldDefinition,
  type MetaFieldGroup,
} from '@zodyk/core';
import { DynamicFieldRenderer, getFieldValue } from './DynamicFieldRenderer';
import { groupFieldsByGroup, setNestedValue, SUPPORTED_LOCALES } from './utils';
import { LocaleTabs } from './LocaleTabs';

interface MetaEntryFormProps {
  fieldGroups: MetaFieldGroup[];
  fields: MetaFieldDefinition[];
  data: Record<string, unknown>;
  translations: Record<string, Record<string, unknown>>;
  defaultLocale: string;
  activeLocale: string;
  onLocaleChange: (locale: string) => void;
  onChange: (data: Record<string, unknown>, translations: Record<string, Record<string, unknown>>) => void;
  metaObjects?: { slug: string; name: string }[];
}

export function MetaEntryForm({
  fieldGroups,
  fields,
  data,
  translations,
  defaultLocale,
  activeLocale,
  onLocaleChange,
  onChange,
  metaObjects,
}: MetaEntryFormProps) {
  const mergedData = mergeLocalizedData(defaultLocale, data, translations, activeLocale);
  const nonSeoGroups = fieldGroups
    .filter((g) => g.key !== SEO_GROUP_KEY)
    .sort((a, b) => a.order - b.order);
  const seoFields = groupFieldsByGroup(fields, SEO_GROUP_KEY);

  const localizedKeys = new Set(fields.filter((f) => f.localized).map((f) => f.key));

  const handleFieldChange = (key: string, value: unknown) => {
    if (activeLocale === defaultLocale || !localizedKeys.has(key)) {
      onChange(setNestedValue(data, key, value), translations);
      return;
    }

    const localeData = { ...(translations[activeLocale] ?? {}) };
    const nextTranslations = {
      ...translations,
      [activeLocale]: setNestedValue(localeData, key, value),
    };
    onChange(data, nextTranslations);
  };

  const currentFormData =
    activeLocale === defaultLocale
      ? data
      : { ...data, ...(translations[activeLocale] ?? {}) };

  return (
    <div className="flex flex-col gap-6">
      <LocaleTabs
        locales={SUPPORTED_LOCALES}
        activeLocale={activeLocale}
        defaultLocale={defaultLocale}
        onChange={onLocaleChange}
      />

      {nonSeoGroups.map((group) => {
        const groupFields = groupFieldsByGroup(fields, group.key).filter((f) => !f.isSystem);
        if (groupFields.length === 0) return null;

        return (
          <section key={group.key} className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-medium text-foreground">{group.label}</h3>
            <div className="flex flex-col gap-4">
              {groupFields.map((field) => {
                if (field.localized && activeLocale !== defaultLocale) {
                  const val = getFieldValue(translations[activeLocale] ?? {}, field);
                  return (
                    <DynamicFieldRenderer
                      key={field.key}
                      field={field}
                      value={val ?? getFieldValue(mergedData, field)}
                      onChange={(v) => handleFieldChange(field.key, v)}
                      allFields={fields}
                      formData={currentFormData}
                      metaObjects={metaObjects}
                    />
                  );
                }
                if (field.localized && activeLocale === defaultLocale) {
                  return (
                    <DynamicFieldRenderer
                      key={field.key}
                      field={field}
                      value={getFieldValue(data, field)}
                      onChange={(v) => handleFieldChange(field.key, v)}
                      allFields={fields}
                      formData={currentFormData}
                      metaObjects={metaObjects}
                    />
                  );
                }
                if (!field.localized && activeLocale !== defaultLocale) return null;

                return (
                  <DynamicFieldRenderer
                    key={field.key}
                    field={field}
                    value={getFieldValue(data, field)}
                    onChange={(v) => handleFieldChange(field.key, v)}
                    allFields={fields}
                    formData={currentFormData}
                    metaObjects={metaObjects}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {seoFields.length > 0 && (
        <section className="rounded-xl border border-border bg-muted/30 p-5">
          <h3 className="mb-4 font-medium text-foreground">SEO</h3>
          <div className="flex flex-col gap-4">
            {seoFields.map((field) => (
              <DynamicFieldRenderer
                key={field.key}
                field={field}
                value={getFieldValue(activeLocale === defaultLocale ? data : { ...data, ...(translations[activeLocale] ?? {}) }, field)}
                onChange={(v) => handleFieldChange(field.key, v)}
                allFields={fields}
                formData={currentFormData}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
