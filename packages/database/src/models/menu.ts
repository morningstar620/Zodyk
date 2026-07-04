import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model } from 'mongoose';

export type MenuItemType = 'home' | 'page' | 'meta_archive' | 'meta_entry' | 'http';

export interface IMenuItem {
  id: string;
  label: string;
  url: string;
  type: MenuItemType;
  resourceId?: string;
  resourceHandle?: string;
  metaType?: string;
  items: IMenuItem[];
}

export interface IMenu extends Document {
  title: string;
  handle: string;
  items: IMenuItem[];
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['home', 'page', 'meta_archive', 'meta_entry', 'http'],
      required: true,
    },
    resourceId: { type: String },
    resourceHandle: { type: String },
    metaType: { type: String },
    items: { type: [], default: [] },
  },
  { _id: false },
);

menuItemSchema.add({ items: [menuItemSchema] });

const menuSchema = new Schema<IMenu>(
  {
    title: { type: String, required: true, trim: true },
    handle: { type: String, required: true, trim: true, lowercase: true },
    items: { type: [menuItemSchema], default: [] },
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
  },
  { timestamps: true },
);

menuSchema.index({ tenantId: 1, handle: 1 }, { unique: true });

export type MenuModel = Model<IMenu>;

export function getMenuModel(mongoose: typeof import('mongoose')): MenuModel {
  return (mongoose.models.Menu as MenuModel) ?? mongoose.model<IMenu>('Menu', menuSchema);
}
