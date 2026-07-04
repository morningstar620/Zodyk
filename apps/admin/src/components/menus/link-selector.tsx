'use client';

import { cn, Input, Label } from '@zodyk/shared-ui';
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Home,
  Shapes,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuItemType } from '@zodyk/core';

export interface LinkSelection {
  label: string;
  url: string;
  type: MenuItemType;
  resourceId?: string;
  resourceHandle?: string;
  metaType?: string;
}

interface LinkTargetCategory {
  id: string;
  label: string;
  icon?: string;
  hasChildren: boolean;
}

interface LinkTargetOption {
  id: string;
  label: string;
  url: string;
  type: MenuItemType;
  resourceId?: string;
  resourceHandle?: string;
  metaType?: string;
}

type LinkSelectorProps = {
  value: string;
  type?: MenuItemType;
  onChange: (selection: LinkSelection) => void;
  className?: string;
};

function CategoryIcon({ icon }: { icon?: string }) {
  if (icon === 'home') return <Home className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (icon === 'file') return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (icon === 'shapes') return <Shapes className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function LinkTypeIcon({ type }: { type?: MenuItemType }) {
  if (type === 'home') return <Home className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (type === 'page') return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (type === 'meta_archive' || type === 'meta_entry')
    return <Shapes className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

export function LinkSelector({ value, type, onChange, className }: LinkSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [categories, setCategories] = useState<LinkTargetCategory[]>([]);
  const [results, setResults] = useState<LinkTargetOption[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryLabel, setCategoryLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (activeCategory) {
        if (activeCategory.startsWith('meta:')) {
          params.set('metaType', activeCategory.replace('meta:', ''));
        } else {
          params.set('category', activeCategory);
        }
      }

      const res = await fetch(`/api/v1/menus/link-targets?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (activeCategory) {
        setResults(data.results ?? []);
        if (data.metaName) setCategoryLabel(data.metaName);
      } else {
        setCategories(data.categories ?? []);
        setResults(data.results ?? []);
      }
    } catch {
      setCategories([]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, activeCategory]);

  useEffect(() => {
    if (!open) return;
    void fetchTargets();
  }, [open, fetchTargets]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  function handleOpen() {
    setOpen(true);
    setQuery('');
    setDebouncedQuery('');
    setActiveCategory(null);
    setCategoryLabel('');
  }

  function selectOption(option: LinkTargetOption) {
    onChange({
      label: option.label,
      url: option.url,
      type: option.type,
      resourceId: option.resourceId,
      resourceHandle: option.resourceHandle,
      metaType: option.metaType,
    });
    setOpen(false);
    setQuery('');
  }

  function selectManual() {
    const url = query.trim() || value || '#';
    onChange({
      label: url,
      url,
      type: 'http',
    });
    setOpen(false);
    setQuery('');
  }

  function drillIntoCategory(category: LinkTargetCategory) {
    if (category.id === 'home') {
      selectOption({ id: 'home', label: 'Home page', url: '/', type: 'home' });
      return;
    }
    setActiveCategory(category.id);
    setCategoryLabel(category.label);
    setQuery('');
    setDebouncedQuery('');
  }

  const showManual = query.trim().length > 0;
  const displayValue = value;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Label htmlFor="link-selector" className="sr-only">
        Link
      </Label>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-md border border-border bg-background px-3 text-left text-sm',
          open && 'ring-2 ring-ring ring-offset-2',
        )}
      >
        <LinkTypeIcon type={type} />
        <span className={cn('flex-1 truncate', !displayValue && 'text-muted-foreground')}>
          {displayValue || 'Search or paste link'}
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-[280px] overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border p-2">
            {activeCategory && (
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory(null);
                    setCategoryLabel('');
                    setQuery('');
                  }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                {results.length > 0 && (
                  <span className="text-xs text-muted-foreground">{results.length} results</span>
                )}
              </div>
            )}
            <Input
              id="link-selector"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or paste link"
              className="h-8"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {showManual && (
              <button
                type="button"
                onClick={selectManual}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{query.trim()}</span>
              </button>
            )}

            {loading && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">Loading…</p>
            )}

            {!loading && !activeCategory && !debouncedQuery && categories.length > 0 && (
              <div className="py-1">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Online store</p>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      category.hasChildren ? drillIntoCategory(category) : selectOption({
                        id: category.id,
                        label: category.label,
                        url: '/',
                        type: 'home',
                      })
                    }
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  >
                    <CategoryIcon icon={category.icon} />
                    <span className="flex-1 truncate">{category.label}</span>
                    {category.hasChildren && (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {!loading && activeCategory && results.length === 0 && !showManual && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">No results</p>
            )}

            {!loading && (activeCategory || debouncedQuery) && results.length > 0 && (
              <div className="py-1">
                {activeCategory && categoryLabel && !debouncedQuery && (
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{categoryLabel}</p>
                )}
                {results.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectOption(option)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  >
                    <LinkTypeIcon type={option.type} />
                    <span className="truncate">{option.label}</span>
                  </button>
                ))}
              </div>
            )}

            {!loading && debouncedQuery && results.length === 0 && !showManual && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">No results</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
