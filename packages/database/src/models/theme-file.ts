import { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IThemeFile extends Document {
  themeId: Types.ObjectId;
  path: string;
  content: string;
  checksum: string;
  contentType: string;
  updatedAt: Date;
  createdAt: Date;
}

const themeFileSchema = new Schema<IThemeFile>(
  {
    themeId: { type: Schema.Types.ObjectId, ref: 'Theme', required: true },
    path: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    checksum: { type: String, required: true },
    contentType: { type: String, required: true, default: 'text/plain' },
  },
  { timestamps: true },
);

themeFileSchema.index({ themeId: 1, path: 1 }, { unique: true });

export type ThemeFileModel = Model<IThemeFile>;

export function getThemeFileModel(mongoose: typeof import('mongoose')): ThemeFileModel {
  return (
    (mongoose.models.ThemeFile as ThemeFileModel) ??
    mongoose.model<IThemeFile>('ThemeFile', themeFileSchema)
  );
}
