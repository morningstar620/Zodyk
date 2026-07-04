'use client';

import { useCallback, useState } from 'react';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './media-editor-crop.css';
import { editorPreviewClass } from './media-editor-classes';
import type { PreviewTransform } from './media-editor-canvas';
import { pendingCssTransform } from './media-editor-canvas';
import {
  isFreeformPreset,
  presetToAspect,
  type AspectPreset,
} from './media-editor-utils';

type MediaEditorPreviewProps = {
  imageUrl: string;
  cropMode: boolean;
  aspectPreset: AspectPreset;
  cropResetKey: number;
  crop: Crop | undefined;
  pendingTransform?: PreviewTransform;
  onCropChange: (crop: Crop | undefined) => void;
  onCropComplete: (pixelCrop: PixelCrop) => void;
  onCropInteractionEnd?: () => void;
  onMediaLoaded?: (size: { width: number; height: number }) => void;
};

function buildInitialCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspectPreset: AspectPreset,
): Crop {
  const aspect = presetToAspect(aspectPreset, mediaWidth, mediaHeight);

  if (aspect) {
    return centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
      mediaWidth,
      mediaHeight,
    );
  }

  return { unit: '%', x: 10, y: 10, width: 80, height: 80 };
}

export function MediaEditorPreview({
  imageUrl,
  cropMode,
  aspectPreset,
  cropResetKey,
  crop,
  pendingTransform,
  onCropChange,
  onCropComplete,
  onCropInteractionEnd,
  onMediaLoaded,
}: MediaEditorPreviewProps) {
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });

  const onImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = event.currentTarget;
      setMediaSize({ width, height });
      onMediaLoaded?.({ width, height });
      onCropChange(buildInitialCrop(width, height, aspectPreset));
    },
    [aspectPreset, onCropChange, onMediaLoaded],
  );

  const aspect = isFreeformPreset(aspectPreset)
    ? undefined
    : presetToAspect(aspectPreset, mediaSize.width, mediaSize.height);

  const cssTransform =
    !cropMode && pendingTransform ? pendingCssTransform(pendingTransform) : undefined;

  const previewImageStyle = cssTransform
    ? { transform: cssTransform, transformOrigin: 'center center' as const }
    : undefined;

  return (
    <div className={editorPreviewClass}>
      {cropMode ? (
        <ReactCrop
          key={`${imageUrl}-${cropResetKey}`}
          crop={crop}
          aspect={aspect}
          ruleOfThirds
          className="editor-react-crop"
          onChange={(_, percentCrop) => onCropChange(percentCrop)}
          onComplete={(pixelCrop) => onCropComplete(pixelCrop)}
          onDragEnd={() => onCropInteractionEnd?.()}
        >
          <img
            src={imageUrl}
            alt="Crop preview"
            onLoad={onImageLoad}
          />
        </ReactCrop>
      ) : (
        <div className="flex h-full w-full items-center justify-center overflow-auto p-8">
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-full max-w-full object-contain select-none"
            draggable={false}
            style={previewImageStyle}
          />
        </div>
      )}
    </div>
  );
}

export type { Crop, PixelCrop };
