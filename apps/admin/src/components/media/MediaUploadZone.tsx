'use client';

import { Button } from '@zodyk/shared-ui';
import { useFeedback } from '@zodyk/shared-ui/feedback';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

interface MediaUploadZoneProps {
  folder: string;
  disabled?: boolean;
  onUploaded: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  compact?: boolean;
}

export function MediaUploadZone({
  folder,
  disabled,
  onUploaded,
  inputRef: externalRef,
  compact = false,
}: MediaUploadZoneProps) {
  const toast = useFeedback();
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return;
    const fileList = Array.from(files);
    setUploading(true);

    const toastId = toast.progress(
      fileList.length === 1
        ? `Uploading ${fileList[0]!.name}`
        : `Uploading ${fileList.length} files`,
      { loadingStyle: 'bar', progress: 0, title: 'Uploading' },
    );

    try {
      for (let index = 0; index < fileList.length; index++) {
        const file = fileList[index]!;
        const fileProgress =
          fileList.length === 1
            ? 35
            : Math.round(((index + 0.35) / fileList.length) * 100);

        toast.update(toastId, {
          message:
            fileList.length === 1
              ? `Uploading ${file.name}`
              : `Uploading ${file.name} (${index + 1}/${fileList.length})`,
          progress: fileProgress,
        });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        const res = await fetch('/api/v1/media/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'Upload failed');
        }

        const completedProgress =
          fileList.length === 1
            ? 100
            : Math.round(((index + 1) / fileList.length) * 100);
        toast.update(toastId, { progress: completedProgress });
      }
      onUploaded();
      toast.success(
        fileList.length === 1 ? 'File uploaded' : `${fileList.length} files uploaded`,
        { id: toastId },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(message, { id: toastId });
    } finally {
      setUploading(false);
      setDragOver(false);
    }
  }, [disabled, folder, onUploaded, toast]);

  useEffect(() => {
    if (!compact || disabled) return;

    let dragDepth = 0;
    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files');

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth += 1;
      setDragOver(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
    };
    const onDragLeave = () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setDragOver(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!event.dataTransfer || !hasFiles(event)) return;
      event.preventDefault();
      dragDepth = 0;
      setDragOver(false);
      if (event.dataTransfer.files.length) void uploadFiles(event.dataTransfer.files);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [compact, disabled, uploadFiles]);

  if (compact) {
    return (
      <>
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
        {dragOver && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
            <p className="rounded-lg bg-card px-6 py-4 text-lg font-medium shadow-lg">
              Drop files to upload
            </p>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center"
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
      <p className="text-sm text-muted-foreground">
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
    </div>
  );
}
