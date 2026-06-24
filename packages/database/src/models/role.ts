import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model } from 'mongoose';

export interface IRole extends Document {
  name: string;
  slug: string;
  permissions: string[];
  isSystem: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
  },
  { timestamps: true },
);

roleSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

export type RoleModel = Model<IRole>;

export function getRoleModel(mongoose: typeof import('mongoose')): RoleModel {
  return (mongoose.models.Role as RoleModel) ?? mongoose.model<IRole>('Role', roleSchema);
}
