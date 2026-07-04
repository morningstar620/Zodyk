export type AspectPreset =
  | 'original'
  | 'square'
  | '3:2'
  | '5:4'
  | '7:5'
  | '16:9'
  | '2:3'
  | '4:5'
  | '5:7'
  | '9:16'
  | 'freeform';

export type Orientation = 'landscape' | 'portrait';

export type SidebarPanel = 'information' | 'crop' | 'transform' | 'resize';

export const LANDSCAPE_RATIOS: { id: AspectPreset; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'square', label: 'Square' },
  { id: '3:2', label: '3:2' },
  { id: '5:4', label: '5:4' },
  { id: '7:5', label: '7:5' },
  { id: '16:9', label: '16:9' },
  { id: 'freeform', label: 'Freeform' },
];

export const PORTRAIT_RATIOS: { id: AspectPreset; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'square', label: 'Square' },
  { id: '2:3', label: '2:3' },
  { id: '4:5', label: '4:5' },
  { id: '5:7', label: '5:7' },
  { id: '9:16', label: '9:16' },
  { id: 'freeform', label: 'Freeform' },
];

const RATIO_VALUES: Partial<Record<AspectPreset, number>> = {
  square: 1,
  '3:2': 3 / 2,
  '5:4': 5 / 4,
  '7:5': 7 / 5,
  '16:9': 16 / 9,
  '2:3': 2 / 3,
  '4:5': 4 / 5,
  '5:7': 5 / 7,
  '9:16': 9 / 16,
};

export function presetToAspect(
  preset: AspectPreset,
  naturalWidth: number,
  naturalHeight: number,
): number | undefined {
  if (preset === 'freeform') return undefined;
  if (preset === 'original') {
    if (!naturalWidth || !naturalHeight) return undefined;
    return naturalWidth / naturalHeight;
  }
  return RATIO_VALUES[preset];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatMimeLabel(mimeType: string): string {
  const sub = mimeType.split('/')[1]?.toUpperCase();
  if (!sub) return 'FILE';
  if (sub === 'JPEG') return 'JPG';
  return sub;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function isFreeformPreset(preset: AspectPreset): boolean {
  return preset === 'freeform';
}

export function mediaEditorFileUrl(assetId: string, variant: 'webp' | 'original' = 'webp'): string {
  return `/api/v1/media/${assetId}/file?variant=${variant}`;
}
