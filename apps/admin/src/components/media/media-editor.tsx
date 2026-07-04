'use client';

import type { MediaAsset, TransformOp } from '@zodyk/core';
import { useFeedback } from '@zodyk/shared-ui/feedback';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Crop, PixelCrop } from 'react-image-crop';
import { MediaEditorCropPanel } from './media-editor-crop-panel';
import { MediaEditorHeader } from './media-editor-header';
import { MediaEditorInfoPanel } from './media-editor-info-panel';
import { MediaEditorPreview } from './media-editor-preview';
import { MediaEditorResizePanel } from './media-editor-resize-panel';
import { MediaEditorTransformPanel } from './media-editor-transform-panel';
import { editorAsideClass, editorGhostButtonClass, editorPreviewClass, editorShellClass } from './media-editor-classes';
import {
  clearPreviewCache,
  defaultAssetTitle,
  hasPendingTransform as isPendingTransformActive,
  pendingTransformOps,
  renderCommittedPreview,
  type PreviewTransform,
} from './media-editor-canvas';
import {
  LANDSCAPE_RATIOS,
  PORTRAIT_RATIOS,
  type AspectPreset,
  type Orientation,
  type SidebarPanel,
  mediaEditorFileUrl,
} from './media-editor-utils';

type MediaEditorProps = {
  assetId: string;
  initialAsset?: MediaAsset;
};

type CropPanelState = {
  aspectPreset: AspectPreset;
  orientation: Orientation;
};

const DEFAULT_CROP_PANEL: CropPanelState = {
  aspectPreset: 'original',
  orientation: 'landscape',
};

const DEFAULT_PENDING: PreviewTransform = {
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
};

async function runTransform(assetId: string, operations: TransformOp[]): Promise<MediaAsset> {
  const res = await fetch(`/api/v1/media/${assetId}/transform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operations }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Transform failed');
  }
  return res.json() as Promise<MediaAsset>;
}

async function runSaveAsNew(
  assetId: string,
  operations: TransformOp[],
  metadata: { title?: string; alt?: string },
): Promise<MediaAsset> {
  const res = await fetch(`/api/v1/media/${assetId}/save-as-new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operations, metadata }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Save as new failed');
  }
  return res.json() as Promise<MediaAsset>;
}

function portraitEquivalent(preset: AspectPreset): AspectPreset {
  const map: Partial<Record<AspectPreset, AspectPreset>> = {
    '3:2': '2:3',
    '5:4': '4:5',
    '7:5': '5:7',
    '16:9': '9:16',
    '2:3': '3:2',
    '4:5': '5:4',
    '5:7': '7:5',
    '9:16': '16:9',
  };
  return map[preset] ?? preset;
}

export function MediaEditor({ assetId, initialAsset }: MediaEditorProps) {
  const router = useRouter();
  const toast = useFeedback();
  const [asset, setAsset] = useState<MediaAsset | null>(initialAsset ?? null);
  const [loading, setLoading] = useState(!initialAsset);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notifyError = useCallback(
    (message: string) => {
      setError(message);
      toast.error(message);
    },
    [toast],
  );

  const [name, setName] = useState(() =>
    initialAsset ? defaultAssetTitle(initialAsset) : '',
  );
  const [alt, setAlt] = useState(() => initialAsset?.metadata.alt ?? '');
  const [activePanel, setActivePanel] = useState<SidebarPanel | null>('crop');

  const [sessionOps, setSessionOps] = useState<TransformOp[]>([]);
  const [pendingTransform, setPendingTransform] = useState<PreviewTransform>(DEFAULT_PENDING);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const previewBlobRef = useRef<string | null>(null);

  const [cropPanel, setCropPanel] = useState<CropPanelState>(DEFAULT_CROP_PANEL);
  const [crop, setCrop] = useState<Crop>();
  const [pixelCrop, setPixelCrop] = useState<PixelCrop | null>(null);
  const [cropResetKey, setCropResetKey] = useState(0);

  const cropHistory = useRef<Crop[]>([]);
  const cropHistoryIndex = useRef(-1);
  const cropRef = useRef<Crop | undefined>(undefined);
  const [historyVersion, setHistoryVersion] = useState(0);

  const [resizeWidth, setResizeWidth] = useState(() =>
    initialAsset?.width ? String(initialAsset.width) : '',
  );
  const [resizeHeight, setResizeHeight] = useState(() =>
    initialAsset?.height ? String(initialAsset.height) : '',
  );
  const [lockAspect, setLockAspect] = useState(true);

  const resetCropSession = useCallback(() => {
    setCrop(undefined);
    setPixelCrop(null);
    setCropPanel(DEFAULT_CROP_PANEL);
    setCropResetKey((k) => k + 1);
    cropHistory.current = [];
    cropHistoryIndex.current = -1;
    setHistoryVersion((v) => v + 1);
  }, []);

  const loadAsset = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/media/${assetId}`);
      if (!res.ok) throw new Error('Failed to load media');
      const data = (await res.json()) as MediaAsset;
      setAsset(data);
      clearPreviewCache();
      setName(defaultAssetTitle(data));
      setAlt(data.metadata.alt ?? '');
      setSessionOps([]);
      setPendingTransform(DEFAULT_PENDING);
      resetCropSession();
      if (data.width && data.height) {
        setResizeWidth(String(data.width));
        setResizeHeight(String(data.height));
      }
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [assetId, resetCropSession, notifyError]);

  useEffect(() => {
    if (initialAsset?.id === assetId) return;
    void loadAsset();
  }, [assetId, initialAsset?.id, loadAsset]);

  useEffect(() => {
    return () => {
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
      }
      clearPreviewCache();
    };
  }, []);

  const originalUrl = asset ? mediaEditorFileUrl(assetId) : '';

  useEffect(() => {
    if (!originalUrl) return;

    if (sessionOps.length === 0) {
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
        previewBlobRef.current = null;
      }
      setPreviewUrl(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    void renderCommittedPreview(originalUrl, sessionOps)
      .then((result) => {
        if (cancelled) return;
        if (previewBlobRef.current) {
          URL.revokeObjectURL(previewBlobRef.current);
        }
        previewBlobRef.current = result.url;
        setPreviewUrl(result.url);
        setPreviewSize({ width: result.width, height: result.height });
        setResizeWidth(String(result.width));
        setResizeHeight(String(result.height));
      })
      .catch((err) => {
        if (!cancelled) {
          notifyError(err instanceof Error ? err.message : 'Preview failed');
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [originalUrl, sessionOps, notifyError]);

  const pushCropHistory = useCallback((next: Crop) => {
    const trimmed = cropHistory.current.slice(0, cropHistoryIndex.current + 1);
    trimmed.push(next);
    cropHistory.current = trimmed.slice(-30);
    cropHistoryIndex.current = cropHistory.current.length - 1;
    setHistoryVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    cropRef.current = crop;
    if (crop && cropHistoryIndex.current === -1) {
      pushCropHistory(crop);
    }
  }, [crop, pushCropHistory]);

  const resetPendingTransform = useCallback(() => {
    setPendingTransform(DEFAULT_PENDING);
  }, []);

  const canUndoCrop = historyVersion >= 0 && cropHistoryIndex.current > 0;
  const canRedoCrop =
    historyVersion >= 0 && cropHistoryIndex.current < cropHistory.current.length - 1;

  const handleUndo = () => {
    if (cropHistoryIndex.current <= 0) return;
    cropHistoryIndex.current -= 1;
    setCrop(cropHistory.current[cropHistoryIndex.current]);
    setHistoryVersion((v) => v + 1);
  };

  const handleRedo = () => {
    if (cropHistoryIndex.current >= cropHistory.current.length - 1) return;
    cropHistoryIndex.current += 1;
    setCrop(cropHistory.current[cropHistoryIndex.current]);
    setHistoryVersion((v) => v + 1);
  };

  const handlePanelToggle = (panel: SidebarPanel) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  const handleOrientationChange = (orientation: Orientation) => {
    const nextPreset = portraitEquivalent(cropPanel.aspectPreset);
    const validPresets = (orientation === 'landscape' ? LANDSCAPE_RATIOS : PORTRAIT_RATIOS).map(
      (r) => r.id,
    );
    setCropPanel({
      orientation,
      aspectPreset: validPresets.includes(nextPreset) ? nextPreset : 'original',
    });
    setCropResetKey((k) => k + 1);
  };

  const handleAspectPresetChange = (aspectPreset: AspectPreset) => {
    setCropPanel((prev) => ({ ...prev, aspectPreset }));
    setCropResetKey((k) => k + 1);
  };

  const cropMode = activePanel === 'crop';

  const handleApplyCrop = () => {
    if (!pixelCrop) return;

    const isFullImage =
      cropPanel.aspectPreset === 'original' &&
      previewSize.width > 0 &&
      Math.round(pixelCrop.width) >= previewSize.width - 2 &&
      Math.round(pixelCrop.height) >= previewSize.height - 2 &&
      Math.round(pixelCrop.x) <= 1 &&
      Math.round(pixelCrop.y) <= 1;

    if (isFullImage) return;

    setSessionOps([
      ...sessionOps,
      {
        type: 'crop',
        left: Math.max(0, Math.round(pixelCrop.x)),
        top: Math.max(0, Math.round(pixelCrop.y)),
        width: Math.max(1, Math.round(pixelCrop.width)),
        height: Math.max(1, Math.round(pixelCrop.height)),
      },
    ]);
    resetCropSession();
    toast.success('Crop applied');
  };

  const handleApplyTransform = () => {
    const ops = pendingTransformOps(pendingTransform);
    if (ops.length === 0) return;

    setSessionOps([...sessionOps, ...ops]);
    resetPendingTransform();
    resetCropSession();
    toast.success('Transform applied');
  };

  const handleFlipHorizontal = () => {
    setPendingTransform((prev) => ({ ...prev, flipHorizontal: !prev.flipHorizontal }));
  };

  const handleFlipVertical = () => {
    setPendingTransform((prev) => ({ ...prev, flipVertical: !prev.flipVertical }));
  };

  const handleRotateLeft = () => {
    setPendingTransform((prev) => ({ ...prev, rotation: prev.rotation - 90 }));
  };

  const handleRotateRight = () => {
    setPendingTransform((prev) => ({ ...prev, rotation: prev.rotation + 90 }));
  };

  const handleApplyResize = () => {
    const width = resizeWidth ? Number(resizeWidth) : undefined;
    const height = resizeHeight ? Number(resizeHeight) : undefined;
    if (!width && !height) return;

    setSessionOps([
      ...sessionOps,
      { type: 'resize', width, height, fit: 'inside' },
    ]);
    resetCropSession();
    toast.success('Resize applied');
  };

  const hasPendingTransform = isPendingTransformActive(pendingTransform);

  const handleWidthChange = (value: string) => {
    setResizeWidth(value);
    if (lockAspect && previewSize.width > 0 && previewSize.height > 0 && value) {
      const w = Number(value);
      if (w > 0) {
        setResizeHeight(String(Math.round((w * previewSize.height) / previewSize.width)));
      }
    }
  };

  const handleHeightChange = (value: string) => {
    setResizeHeight(value);
    if (lockAspect && previewSize.width > 0 && previewSize.height > 0 && value) {
      const h = Number(value);
      if (h > 0) {
        setResizeWidth(String(Math.round((h * previewSize.width) / previewSize.height)));
      }
    }
  };

  const transformsDirty =
    sessionOps.length > 0 ||
    pendingTransform.rotation !== 0 ||
    pendingTransform.flipHorizontal ||
    pendingTransform.flipVertical;

  const metadataDirty =
    asset &&
    (name !== defaultAssetTitle(asset) || alt !== (asset.metadata.alt ?? ''));

  const hasUnsavedChanges = Boolean(transformsDirty || metadataDirty);

  const handleSave = async () => {
    if (!asset) return;
    setSaving(true);
    setError(null);
    const toastId = toast.progress('Saving changes', { loadingStyle: 'dots' });
    try {
      const finalOps = [...sessionOps, ...pendingTransformOps(pendingTransform)];
      if (finalOps.length > 0) {
        await runTransform(assetId, finalOps);
      }
      if (metadataDirty) {
        const res = await fetch(`/api/v1/media/${assetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata: { title: name, alt } }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'Failed to save');
        }
      }
      toast.success('Changes saved', { id: toastId });
      router.push('/media');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      toast.failure(message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsNew = async () => {
    if (!asset) return;
    setSaving(true);
    setError(null);
    const toastId = toast.progress('Saving as new file', { loadingStyle: 'dots' });
    try {
      const finalOps = [...sessionOps, ...pendingTransformOps(pendingTransform)];
      await runSaveAsNew(assetId, finalOps, { title: name, alt });
      toast.success('Saved as new file', { id: toastId });
      router.push('/media');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save as new failed';
      setError(message);
      toast.failure(message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (hasUnsavedChanges && !confirm('Discard unsaved changes?')) return;
    router.push('/media');
  };

  if (!loading && !asset) {
    return (
      <div className={editorShellClass}>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <p className="text-red-400">{error ?? 'Media not found'}</p>
          <button
            type="button"
            onClick={() => router.push('/media')}
            className={editorGhostButtonClass}
          >
            Back to library
          </button>
        </div>
      </div>
    );
  }

  const displayTitle = name.trim() || (asset ? defaultAssetTitle(asset) : 'Loading…');
  const imageUrl = previewUrl ?? originalUrl;
  const editorReady = Boolean(asset);

  return (
    <div className={editorShellClass}>
      <MediaEditorHeader
        title={displayTitle}
        onBack={handleDiscard}
        onDiscard={handleDiscard}
        onSave={() => void handleSave()}
        onSaveAsNew={() => void handleSaveAsNew()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndoCrop && cropMode}
        canRedo={canRedoCrop && cropMode}
        saving={saving}
      />

      <div className="flex min-h-0 flex-1">
        {editorReady ? (
          <MediaEditorPreview
            imageUrl={imageUrl}
            cropMode={cropMode}
            aspectPreset={cropPanel.aspectPreset}
            cropResetKey={cropResetKey}
            crop={crop}
            pendingTransform={cropMode ? undefined : pendingTransform}
            onCropChange={setCrop}
            onCropComplete={(area) => {
              setPixelCrop(area);
            }}
            onCropInteractionEnd={() => {
              if (cropRef.current) pushCropHistory(cropRef.current);
            }}
            onMediaLoaded={(size) => {
              if (previewSize.width === 0) {
                setPreviewSize(size);
              }
            }}
          />
        ) : (
          <div className={editorPreviewClass}>
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        )}

        <aside className={editorAsideClass}>
          {editorReady && asset ? (
            <div className="flex flex-col gap-2">
              <MediaEditorInfoPanel
                asset={asset}
                name={name}
                alt={alt}
                expanded={activePanel === 'information'}
                onToggle={() => handlePanelToggle('information')}
                onNameChange={setName}
                onAltChange={setAlt}
              />

              <MediaEditorCropPanel
                expanded={activePanel === 'crop'}
                onToggle={() => handlePanelToggle('crop')}
                orientation={cropPanel.orientation}
                onOrientationChange={handleOrientationChange}
                aspectPreset={cropPanel.aspectPreset}
                onAspectPresetChange={handleAspectPresetChange}
                onApply={handleApplyCrop}
                applying={previewLoading}
                canApply={Boolean(pixelCrop)}
              />

              <MediaEditorTransformPanel
                expanded={activePanel === 'transform'}
                onToggle={() => handlePanelToggle('transform')}
                flipHorizontal={pendingTransform.flipHorizontal}
                flipVertical={pendingTransform.flipVertical}
                onFlipHorizontal={handleFlipHorizontal}
                onFlipVertical={handleFlipVertical}
                onRotateLeft={handleRotateLeft}
                onRotateRight={handleRotateRight}
                onApply={handleApplyTransform}
                applying={false}
                canApply={hasPendingTransform}
              />

              <MediaEditorResizePanel
                expanded={activePanel === 'resize'}
                onToggle={() => handlePanelToggle('resize')}
                width={resizeWidth}
                height={resizeHeight}
                lockAspect={lockAspect}
                onWidthChange={handleWidthChange}
                onHeightChange={handleHeightChange}
                onLockAspectChange={setLockAspect}
                onApply={handleApplyResize}
                applying={previewLoading}
                canApply={Boolean(resizeWidth || resizeHeight)}
              />
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </aside>
      </div>
    </div>
  );
}
