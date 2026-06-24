import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model, type Types } from 'mongoose';

export type TemplateResourceType = 'page' | 'meta_entry';

export interface ITemplateCustomization extends Document {
  tenantId: string;
  themeId: Types.ObjectId;
  resourceType: TemplateResourceType;
  resourceId: Types.ObjectId;
  templateKey: string;
  sectionOverrides: Record<string, Record<string, unknown>>;
  createdAt: Date;
  updatedAt: Date;
}

const templateCustomizationSchema = new Schema<ITemplateCustomization>(
  {
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    themeId: { type: Schema.Types.ObjectId, ref: 'Theme', required: true },
    resourceType: { type: String, enum: ['page', 'meta_entry'], required: true },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    templateKey: { type: String, required: true },
    sectionOverrides: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

templateCustomizationSchema.index(
  { tenantId: 1, resourceType: 1, resourceId: 1 },
  { unique: true },
);

export type TemplateCustomizationModel = Model<ITemplateCustomization>;

export function getTemplateCustomizationModel(
  mongoose: typeof import('mongoose'),
): TemplateCustomizationModel {
  return (
    (mongoose.models.TemplateCustomization as TemplateCustomizationModel) ??
    mongoose.model<ITemplateCustomization>('TemplateCustomization', templateCustomizationSchema)
  );
}
