export type MediaVariantFormat = 'webp' | 'avif';

export interface MediaVariant {
  format: MediaVariantFormat;
  r2Key: string;
  width: number;
  height: number;
  size: number;
}

export interface MediaMetadata {
  alt?: string;
  title?: string;
  caption?: string;
}

export type ImageOutputFormat = 'webp' | 'avif' | 'jpeg' | 'png';

export type TransformOp =
  | { type: 'resize'; width?: number; height?: number; fit?: 'cover' | 'contain' | 'inside' }
  | { type: 'crop'; left: number; top: number; width: number; height: number }
  | { type: 'rotate'; angle: number }
  | { type: 'flip'; axis: 'horizontal' | 'vertical' }
  | { type: 'compress'; quality: number; format?: ImageOutputFormat }
  | { type: 'convert'; format: ImageOutputFormat }
  | { type: 'stripMetadata' };

export interface MediaAsset {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  folder: string;
  r2Key: string;
  variants: MediaVariant[];
  metadata: MediaMetadata;
  uploadedBy?: string;
  url: string;
  variantUrls?: Partial<Record<MediaVariantFormat, string>>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaStorageStats {
  totalBytes: number;
  totalCount: number;
  imagesBytes: number;
  imagesCount: number;
  videoBytes: number;
  videoCount: number;
  documentsBytes: number;
  documentsCount: number;
  quotaBytes: number;
}

export interface R2SettingsPublic {
  accountId: string;
  accessKeyId: string;
  bucket: string;
  publicUrl?: string;
  endpoint?: string;
}

export type R2ConfigSource = 'env' | 'db' | null;

export interface MediaConfigStatus {
  configured: boolean;
  source: R2ConfigSource;
  settings?: R2SettingsPublic & { accessKeyIdMasked: string };
}
