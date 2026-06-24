'use client';

import { Input, Skeleton } from '@zodyk/shared-ui';
import { useEffect, useState } from 'react';

interface RelationPickerProps {
  targetSlug: string;
  cardinality: 'one' | 'many';
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}

interface EntryOption {
  id: string;
  label: string;
}

export function RelationPicker({
  targetSlug,
  cardinality,
  value,
  onChange,
}: RelationPickerProps) {
  const [options, setOptions] = useState<EntryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const selected = cardinality === 'many' ? (Array.isArray(value) ? value : []) : value ? [value as string] : [];

  useEffect(() => {
    fetch(`/api/v1/meta-objects/${targetSlug}/entries?limit=50`)
      .then((r) => r.json())
      .then((data) => {
        const entries = (data.data ?? []) as { id: string; data: Record<string, unknown> }[];
        setOptions(
          entries.map((e) => ({
            id: e.id,
            label:
              String(
                e.data.title ??
                  e.data.name ??
                  e.data.quote ??
                  Object.values(e.data).find((v) => typeof v === 'string') ??
                  e.id,
              ),
          })),
        );
        setLoading(false);
      })
      .catch(() => {
        setOptions([]);
        setLoading(false);
      });
  }, [targetSlug]);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id: string) => {
    if (cardinality === 'one') {
      onChange(id);
      return;
    }
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Search entries..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-48 overflow-y-auto rounded-md border border-zinc-200">
        {loading ? (
          <div className="space-y-0 divide-y divide-zinc-100 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="my-2 h-5 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-3 text-sm text-zinc-500">No entries found</p>
        ) : (
          filtered.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2 border-b border-zinc-100 px-3 py-2 last:border-0 hover:bg-zinc-50"
            >
              <input
                type={cardinality === 'many' ? 'checkbox' : 'radio'}
                name={`relation-${targetSlug}`}
                checked={selected.includes(option.id)}
                onChange={() => toggle(option.id)}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-zinc-500">
          Selected: {selected.length} {cardinality === 'one' ? 'entry' : 'entries'}
        </p>
      )}
    </div>
  );
}
