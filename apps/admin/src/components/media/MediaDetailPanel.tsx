'use client';

import type { MediaAsset } from '@zodyk/core';
import { Button, Input, Label } from '@zodyk/shared-ui';
import { useState } from 'react';

interface MediaDetailPanelProps {
  item: MediaAsset;
  onClose: () => void;
  onUpdated: (item: MediaAsset) => void;
  onDeleted: (id: string) => void;
}

export function MediaDetailPanel({ item, onClose, onUpdated, onDeleted }: MediaDetailPanelProps) {
  const [alt, setAlt] = useState(item.metadata.alt ?? '');
  const [title, setTitle] = useState(item.metadata.title ?? '');
  const [caption, setCaption] = useState(item.metadata.caption ?? '');
  const [folder, setFolder] = useState(item.folder);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isImage = item.mimeType.startsWith('image/');

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/media/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: { alt, title, caption },
          folder,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = (await res.json()) as MediaAsset;
      onUpdated(updated);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this media file?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/media/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      onDeleted(item.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(item.url);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4">
          <h2 className="font-semibold text-zinc-900">Media details</h2>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {isImage && (
            <img
              src={item.variantUrls?.webp ?? item.url}
              alt={alt || item.originalFilename}
              className="w-full rounded-lg border border-zinc-200"
            />
          )}
          <p className="text-sm text-zinc-600">{item.originalFilename}</p>
          <div className="space-y-2">
            <Label htmlFor="media-alt">Alt text</Label>
            <Input id="media-alt" value={alt} onChange={(e) => setAlt(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="media-title">Title</Label>
            <Input id="media-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="media-caption">Caption</Label>
            <Input
              id="media-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="media-folder">Folder</Label>
            <Input id="media-folder" value={folder} onChange={(e) => setFolder(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void copyUrl()}>
              Copy URL
            </Button>
          </div>
        </div>
        <div className="flex gap-2 border-t border-zinc-200 p-4">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-red-600"
            onClick={() => void remove()}
            disabled={deleting}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
