import { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IThemeFile extends Document {
  themeId: Types.ObjectId;
  path: string;
  /** Storage-agnostic object key (relative path for local, full R2 key for cloud). */
  storageKey: string;
  size: number;
  checksum: string;
  contentType: string;
  /**
   * @deprecated Use storageKey. Kept for dual-read during migration from R2-named field.
   */
  r2Key?: string;
  /** @deprecated Legacy inline storage — migrated to object storage / local FS */
  content?: string;
  updatedAt: Date;
  createdAt: Date;
}

const themeFileSchema = new Schema<IThemeFile>(
  {
    themeId: { type: Schema.Types.ObjectId, ref: 'Theme', required: true },
    path: { type: String, required: true, trim: true },
    storageKey: { type: String, trim: true },
    r2Key: { type: String, trim: true },
    size: { type: Number, required: true, default: 0 },
    checksum: { type: String, required: true },
    contentType: { type: String, required: true, default: 'text/plain' },
    content: { type: String },
  },
  { timestamps: true },
);

themeFileSchema.index({ themeId: 1, path: 1 }, { unique: true });

themeFileSchema.pre('validate', function (next) {
  if (!this.storageKey && this.r2Key) {
    this.storageKey = this.r2Key;
  }
  if (!this.storageKey) {
    next(new Error('storageKey is required'));
    return;
  }
  next();
});

export type ThemeFileModel = Model<IThemeFile>;

export function getThemeFileModel(mongoose: typeof import('mongoose')): ThemeFileModel {
  return (
    (mongoose.models.ThemeFile as ThemeFileModel) ??
    mongoose.model<IThemeFile>('ThemeFile', themeFileSchema)
  );
}

/** Resolve storage key from lean/doc with dual-read fallback. */
export function resolveThemeFileStorageKey(file: {
  storageKey?: string;
  r2Key?: string;
  path: string;
}): string {
  return file.storageKey || file.r2Key || file.path;
}
