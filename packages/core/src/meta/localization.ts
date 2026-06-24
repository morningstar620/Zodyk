export function mergeLocalizedData(
  defaultLocale: string,
  data: Record<string, unknown>,
  translations: Record<string, Record<string, unknown>> | undefined,
  locale: string,
): Record<string, unknown> {
  if (locale === defaultLocale) return { ...data };
  const translation = translations?.[locale];
  if (!translation) return { ...data };
  return { ...data, ...translation };
}

export function extractLocalizedPatch(
  localizedFieldKeys: string[],
  locale: string,
  defaultLocale: string,
  fullData: Record<string, unknown>,
): { data: Record<string, unknown>; translations: Record<string, Record<string, unknown>> } {
  if (locale === defaultLocale) {
    return { data: fullData, translations: {} };
  }

  const translation: Record<string, unknown> = {};
  const data = { ...fullData };

  for (const key of localizedFieldKeys) {
    const value = getNestedValue(fullData, key);
    if (value !== undefined) {
      setNestedValue(translation, key, value);
      deleteNestedValue(data, key);
    }
  }

  return {
    data,
    translations: { [locale]: translation },
  };
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current) || typeof current[part] !== 'object') current[part] = {};
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]!] = value;
}

function deleteNestedValue(obj: Record<string, unknown>, path: string): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current)) return;
    current = current[part] as Record<string, unknown>;
  }
  delete current[parts[parts.length - 1]!];
}
