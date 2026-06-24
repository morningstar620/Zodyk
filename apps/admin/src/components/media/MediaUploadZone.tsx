'use client';

import { Button } from '@zodyk/shared-ui';
import { useRef, useState } from 'react';

interface MediaUploadZoneProps {
  folder: string;
  disabled?: boolean;
  onUploaded: () => void;
}

export function MediaUploadZone({ folder, disabled, onUploaded }: MediaUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    if (disabled) return;
    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        const res = await fetch('/api/v1/media/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'Upload failed');
        }
      }
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 p-6 text-center"
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) {
          void uploadFiles(e.dataTransfer.files);
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          if (e.target.files?.length) {
            void uploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />
      <p className="text-sm text-zinc-600">
        {uploading ? 'Uploading…' : 'Drag and drop files here, or'}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-2"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        Choose files
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
