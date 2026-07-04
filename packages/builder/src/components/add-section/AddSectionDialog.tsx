'use client';

import { cn } from '@zodyk/shared-ui';
import { Search, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSectionIcon } from '../../lib/section-icons';
import { useCustomizerStore } from '../../store';
import type { SectionGroupName } from '../../store';

interface AddSectionDialogProps {
  group: SectionGroupName;
  onClose: () => void;
}

function filterSectionsForGroup(
  type: string,
  schema: { category?: string; name: string; enabled_on?: { groups?: string[] } },
  group: SectionGroupName,
): boolean {
  if (group === 'header' && type !== 'header' && schema.category !== 'Header') {
    if (!schema.enabled_on?.groups?.includes('header')) return false;
  }
  if (group === 'footer' && type !== 'footer' && schema.category !== 'Footer') {
    if (!schema.enabled_on?.groups?.includes('footer')) return false;
  }
  if (group === 'template' && (type === 'header' || type === 'footer')) return false;
  return true;
}

export function AddSectionDialog({ group, onClose }: AddSectionDialogProps) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'sections' | 'apps'>('sections');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [hoverType, setHoverType] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    sectionSchemas,
    sectionTypeList,
    editorMeta,
    themeMeta,
    addSection,
    pushHistory,
    selectSection,
    trackSectionUsed,
    mergeSectionSchemas,
  } = useCustomizerStore();

  useEffect(() => {
    if (sectionTypeList.length <= Object.keys(sectionSchemas).length) return;
    void (async () => {
      const res = await fetch(`/api/v1/themes/${themeMeta.themeId}/schemas?scope=all`);
      if (!res.ok) return;
      const data = (await res.json()) as { sectionSchemas: typeof sectionSchemas };
      mergeSectionSchemas(data.sectionSchemas);
    })();
  }, [sectionSchemas, sectionTypeList.length, themeMeta.themeId, mergeSectionSchemas]);

  const allSections = useMemo(() => {
    return Object.entries(sectionSchemas)
      .filter(([type, schema]) => filterSectionsForGroup(type, schema, group))
      .map(([type, schema]) => ({ type, schema }));
  }, [sectionSchemas, group]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allSections;
    return allSections.filter(
      ({ type, schema }) =>
        schema.name.toLowerCase().includes(q) ||
        type.toLowerCase().includes(q) ||
        (schema.category?.toLowerCase().includes(q) ?? false),
    );
  }, [allSections, search]);

  const recent = useMemo(() => {
    return editorMeta.recentlyUsedSections
      .map((type) => allSections.find((s) => s.type === type))
      .filter(Boolean) as typeof allSections;
  }, [editorMeta.recentlyUsedSections, allSections]);

  const handleAdd = useCallback(
    (type: string) => {
      pushHistory();
      const id = addSection(type, undefined, group);
      if (id) {
        trackSectionUsed(type);
        selectSection(id);
      }
      onClose();
    },
    [addSection, group, onClose, pushHistory, selectSection, trackSectionUsed],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[highlightIndex]) {
        e.preventDefault();
        handleAdd(filtered[highlightIndex]!.type);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filtered, highlightIndex, handleAdd, onClose]);

  const previewType = hoverType ?? filtered[highlightIndex]?.type;
  const previewSchema = previewType ? sectionSchemas[previewType] : undefined;
  const PreviewIcon = previewType ? getSectionIcon(previewType, previewSchema?.category) : null;

  return (
    <>
      <div className="absolute inset-0 z-40 bg-black/20" onClick={onClose} />
      <div
        className="absolute bottom-4 left-4 z-50 flex shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl"
        style={{ width: 657, height: 570 }}
        role="dialog"
        aria-label="Add section"
      >
        <div
          className="flex shrink-0 flex-col border-r border-zinc-200"
          style={{ width: 260, height: 570 }}
        >
          <div className="border-b border-zinc-200 p-3">
            <div
              className="flex items-center rounded-md border border-zinc-200"
              style={{ gap: 8, padding: '6px 8px' }}
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
              <input
                ref={inputRef}
                type="search"
                placeholder="Search sections"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIndex(0);
                }}
              />
            </div>
            <div className="mt-2 flex gap-1">
              <button
                type="button"
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium',
                  tab === 'sections' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100',
                )}
                onClick={() => setTab('sections')}
              >
                Sections
              </button>
              <button
                type="button"
                disabled
                className="rounded px-2 py-1 text-xs text-zinc-400"
                title="Coming soon"
              >
                Apps
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {!search && recent.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 px-2 text-xs font-semibold text-zinc-500">Recently used</p>
                {recent.map(({ type, schema }) => {
                  const Icon = getSectionIcon(type, schema.category);
                  return (
                    <button
                      key={`recent-${type}`}
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-50"
                      onClick={() => handleAdd(type)}
                      onMouseEnter={() => setHoverType(type)}
                    >
                      <Icon className="h-4 w-4 text-zinc-400" />
                      {schema.name}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              disabled
              className="mb-2 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-zinc-400"
            >
              <Sparkles className="h-4 w-4" />
              Generate
              <span className="ml-auto text-xs">Coming soon</span>
            </button>

            <p className="mb-1 px-2 text-xs font-semibold text-zinc-500">Available sections</p>
            {filtered.map(({ type, schema }, index) => {
              const Icon = getSectionIcon(type, schema.category);
              return (
                <button
                  key={type}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
                    index === highlightIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-zinc-50',
                  )}
                  onClick={() => handleAdd(type)}
                  onMouseEnter={() => {
                    setHoverType(type);
                    setHighlightIndex(index);
                  }}
                >
                  <Icon className="h-4 w-4 text-zinc-400" />
                  {schema.name}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-zinc-400">No sections found</p>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 flex-col items-center justify-center bg-zinc-50 p-6"
          style={{ width: 397, height: 570 }}
        >
          {PreviewIcon && previewSchema ? (
            <>
              <PreviewIcon className="mb-4 h-12 w-12 text-zinc-300" />
              <h3 className="text-sm font-semibold text-zinc-900">{previewSchema.name}</h3>
              {previewSchema.category && (
                <p className="mt-1 text-xs text-zinc-500">{previewSchema.category}</p>
              )}
              {previewSchema.description && (
                <p className="mt-2 text-center text-xs text-zinc-500">{previewSchema.description}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-400">Hover a section to preview</p>
          )}
        </div>
      </div>
    </>
  );
}
