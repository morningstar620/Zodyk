import type { EditorMeta } from '../store/types';

const STORAGE_PREFIX = 'zodyk-customizer-meta:';

export function loadEditorMeta(themeId: string): EditorMeta {
  if (typeof window === 'undefined') return defaultMeta();
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${themeId}`);
    if (!raw) return defaultMeta();
    return { ...defaultMeta(), ...JSON.parse(raw) };
  } catch {
    return defaultMeta();
  }
}

export function saveEditorMeta(themeId: string, meta: EditorMeta): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${themeId}`, JSON.stringify(meta));
  } catch {
    /* ignore quota errors */
  }
}

function defaultMeta(): EditorMeta {
  return {
    displayNames: {},
    hiddenSections: {},
    recentlyUsedSections: [],
    accordionExpanded: {},
    expandedSections: {},
  };
}

export function trackRecentlyUsed(meta: EditorMeta, sectionType: string): EditorMeta {
  const next = [sectionType, ...meta.recentlyUsedSections.filter((t) => t !== sectionType)].slice(
    0,
    8,
  );
  return { ...meta, recentlyUsedSections: next };
}
