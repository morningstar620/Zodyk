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

export interface MediaAsset {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  folder: string;
  r2Key: string;
  variants: MediaVariant[];
  metadata: MediaMetadata;
  uploadedBy?: string;
  url: string;
  variantUrls?: Partial<Record<MediaVariantFormat, string>>;
  createdAt: Date;
  updatedAt: Date;
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
