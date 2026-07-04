import type { TransformOp } from '@zodyk/core';

export type PreviewTransform = {
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
};

type RasterLayer = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
};

let sourceCache: { url: string; layer: RasterLayer } | null = null;
let committedCache: { key: string; layer: RasterLayer } | null = null;
let previewUrlCache: { key: string; url: string; width: number; height: number } | null = null;
let workCanvas: HTMLCanvasElement | null = null;

function getWorkCanvas(): HTMLCanvasElement {
  if (!workCanvas) workCanvas = document.createElement('canvas');
  return workCanvas;
}

function closeLayer(layer: RasterLayer | null) {
  layer?.bitmap.close();
}

function opsKey(ops: TransformOp[]): string {
  return JSON.stringify(ops);
}

async function loadRaster(url: string): Promise<RasterLayer> {
  if (sourceCache?.url === url) return sourceCache.layer;

  closeLayer(sourceCache?.layer ?? null);
  sourceCache = null;

  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error('Failed to load image');
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);

  const layer = { bitmap, width: bitmap.width, height: bitmap.height };
  sourceCache = { url, layer };
  return layer;
}

function drawLayerToCanvas(layer: RasterLayer): HTMLCanvasElement {
  const canvas = getWorkCanvas();
  canvas.width = layer.width;
  canvas.height = layer.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, layer.width, layer.height);
  ctx.drawImage(layer.bitmap, 0, 0);
  return canvas;
}

function applyRotate(
  source: CanvasImageSource,
  width: number,
  height: number,
  angle: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const norm = ((Math.round(angle) % 360) + 360) % 360;
  if (norm === 0) {
    const canvas = getWorkCanvas();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
    return { canvas, width, height };
  }

  const swap = norm === 90 || norm === 270;
  const cw = swap ? height : width;
  const ch = swap ? width : height;
  const canvas = getWorkCanvas();
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate((norm * Math.PI) / 180);
  ctx.drawImage(source, -width / 2, -height / 2, width, height);
  return { canvas, width: cw, height: ch };
}

function applyFlip(
  source: CanvasImageSource,
  width: number,
  height: number,
  axis: 'horizontal' | 'vertical',
): HTMLCanvasElement {
  const canvas = getWorkCanvas();
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (axis === 'horizontal') {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function applyCrop(
  source: CanvasImageSource,
  width: number,
  height: number,
  left: number,
  top: number,
  cropWidth: number,
  cropHeight: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const x = Math.max(0, Math.min(Math.round(left), width - 1));
  const y = Math.max(0, Math.min(Math.round(top), height - 1));
  const w = Math.max(1, Math.min(Math.round(cropWidth), width - x));
  const h = Math.max(1, Math.min(Math.round(cropHeight), height - y));

  const canvas = getWorkCanvas();
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
  return { canvas, width: w, height: h };
}

function applyResize(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  targetWidth?: number,
  targetHeight?: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  let w = targetWidth ? Math.round(targetWidth) : srcWidth;
  let h = targetHeight ? Math.round(targetHeight) : srcHeight;

  if (targetWidth && !targetHeight) {
    h = Math.round((srcHeight * w) / srcWidth);
  } else if (targetHeight && !targetWidth) {
    w = Math.round((srcWidth * h) / srcHeight);
  }

  w = Math.max(1, w);
  h = Math.max(1, h);

  const canvas = getWorkCanvas();
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, srcWidth, srcHeight, 0, 0, w, h);
  return { canvas, width: w, height: h };
}

function applyOp(
  source: CanvasImageSource,
  width: number,
  height: number,
  op: TransformOp,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  switch (op.type) {
    case 'rotate':
      return applyRotate(source, width, height, op.angle);
    case 'flip':
      return {
        canvas: applyFlip(source, width, height, op.axis),
        width,
        height,
      };
    case 'crop':
      return applyCrop(source, width, height, op.left, op.top, op.width, op.height);
    case 'resize':
      return applyResize(source, width, height, op.width, op.height);
    default: {
      const canvas = getWorkCanvas();
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(source, 0, 0, width, height);
      return { canvas, width, height };
    }
  }
}

async function rasterFromOps(layer: RasterLayer, ops: TransformOp[]): Promise<RasterLayer> {
  if (ops.length === 0) return layer;

  let current: CanvasImageSource = layer.bitmap;
  let width = layer.width;
  let height = layer.height;

  for (const op of ops) {
    const result = applyOp(current, width, height, op);
    current = result.canvas;
    width = result.width;
    height = result.height;
  }

  const bitmap = await createImageBitmap(current as HTMLCanvasElement);
  return { bitmap, width, height };
}

async function getCommittedLayer(url: string, committedOps: TransformOp[]): Promise<RasterLayer> {
  const key = opsKey(committedOps);
  if (committedCache?.key === key && sourceCache?.url === url) {
    return committedCache.layer;
  }

  closeLayer(committedCache?.layer ?? null);
  committedCache = null;

  const source = await loadRaster(url);
  const layer =
    committedOps.length === 0 ? source : await rasterFromOps(source, committedOps);

  if (committedOps.length > 0) {
    committedCache = { key, layer };
  }

  return layer;
}

function canvasToPreviewUrl(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode preview'));
          return;
        }
        resolve({ url: URL.createObjectURL(blob), width, height });
      },
      'image/jpeg',
      0.9,
    );
  });
}

export function pendingTransformOps(pending: PreviewTransform): TransformOp[] {
  const ops: TransformOp[] = [];
  const norm = ((Math.round(pending.rotation) % 360) + 360) % 360;
  if (norm !== 0) ops.push({ type: 'rotate', angle: norm });
  if (pending.flipHorizontal) ops.push({ type: 'flip', axis: 'horizontal' });
  if (pending.flipVertical) ops.push({ type: 'flip', axis: 'vertical' });
  return ops;
}

/** CSS transform for live flip/rotate preview (matches pendingTransformOps order). */
export function pendingCssTransform(pending: PreviewTransform): string | undefined {
  const norm = ((Math.round(pending.rotation) % 360) + 360) % 360;
  const parts: string[] = [];
  if (pending.flipVertical) parts.push('scaleY(-1)');
  if (pending.flipHorizontal) parts.push('scaleX(-1)');
  if (norm !== 0) parts.push(`rotate(${norm}deg)`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export function hasPendingTransform(pending: PreviewTransform): boolean {
  return pendingCssTransform(pending) !== undefined;
}

export function clearPreviewCache(): void {
  closeLayer(sourceCache?.layer ?? null);
  closeLayer(committedCache?.layer ?? null);
  if (previewUrlCache) URL.revokeObjectURL(previewUrlCache.url);
  sourceCache = null;
  committedCache = null;
  previewUrlCache = null;
}

/** Renders committed edits only (crop/resize/applied transforms). Pending flip/rotate uses CSS. */
export async function renderCommittedPreview(
  imageUrl: string,
  committedOps: TransformOp[],
): Promise<{ url: string; width: number; height: number }> {
  const cacheKey = `${imageUrl}::${opsKey(committedOps)}`;
  if (previewUrlCache?.key === cacheKey) {
    return {
      url: previewUrlCache.url,
      width: previewUrlCache.width,
      height: previewUrlCache.height,
    };
  }

  const layer = await getCommittedLayer(imageUrl, committedOps);

  if (committedOps.length === 0) {
    const canvas = drawLayerToCanvas(layer);
    const result = await canvasToPreviewUrl(canvas, layer.width, layer.height);
    if (previewUrlCache) URL.revokeObjectURL(previewUrlCache.url);
    previewUrlCache = { key: cacheKey, ...result };
    return result;
  }

  const canvas = drawLayerToCanvas(layer);
  const result = await canvasToPreviewUrl(canvas, layer.width, layer.height);
  if (previewUrlCache) URL.revokeObjectURL(previewUrlCache.url);
  previewUrlCache = { key: cacheKey, ...result };
  return result;
}

export function defaultAssetTitle(asset: { metadata: { title?: string }; originalFilename: string }): string {
  const title = asset.metadata.title?.trim();
  if (title) return title;
  const stem = asset.originalFilename.replace(/\.[^.]+$/, '');
  return stem || asset.originalFilename;
}
