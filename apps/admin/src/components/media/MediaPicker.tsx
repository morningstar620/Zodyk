'use client';

import type { MediaAsset } from '@zodyk/core';
import { Button, Skeleton } from '@zodyk/shared-ui';
import { useEffect, useState } from 'react';
import { MediaLibrary } from './MediaLibrary';

interface MediaPickerProps {
  mode: 'single' | 'multiple';
  accept?: string;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}

export function MediaPicker({ mode, accept, value, onChange }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [previews, setPreviews] = useState<MediaAsset[]>([]);
  const [previewsLoading, setPreviewsLoading] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>([]);

  const selectedIds = mode === 'multiple' ? (Array.isArray(value) ? value : []) : value ? [value as string] : [];

  useEffect(() => {
    const load = async () => {
      setPreviewsLoading(true);
      const loaded: MediaAsset[] = [];
      for (const id of selectedIds) {
        const res = await fetch(`/api/v1/media/${id}`);
        if (res.ok) {
          loaded.push((await res.json()) as MediaAsset);
        }
      }
      setPreviews(loaded);
      setPreviewsLoading(false);
    };
    if (selectedIds.length) {
      void load();
    } else {
      setPreviews([]);
      setPreviewsLoading(false);
    }
  }, [selectedIds.join(',')]);

  const applySelection = (ids: string[]) => {
    if (mode === 'single') {
      onChange(ids[0] ?? '');
    } else {
      onChange(ids);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {previewsLoading &&
          selectedIds.map((id) => (
            <Skeleton key={id} className="h-14 w-32 rounded-md" />
          ))}
        {!previewsLoading &&
          previews.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2"
          >
            {item.mimeType.startsWith('image/') ? (
              <img
                src={item.variantUrls?.webp ?? item.url}
                alt={item.metadata.alt ?? item.originalFilename}
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <span className="text-xs text-zinc-500">{item.originalFilename}</span>
            )}
            <Button
              type="button"
              variant="ghost"
              className="text-xs"
              onClick={() => {
                if (mode === 'single') {
                  onChange('');
                } else {
                  onChange(selectedIds.filter((id) => id !== item.id));
                }
              }}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" onClick={() => {
        setTempSelected(selectedIds);
        setOpen(true);
      }}>
        {selectedIds.length ? 'Change media' : 'Select media'}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 p-4">
              <h2 className="font-semibold">Media library</h2>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => applySelection(tempSelected)}
                  disabled={!tempSelected.length}
                >
                  Use selected
                </Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto p-4">
              <MediaLibrary
                embedded
                selectionMode={mode}
                accept={accept}
                selectedIds={tempSelected}
                onSelectionChange={setTempSelected}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
