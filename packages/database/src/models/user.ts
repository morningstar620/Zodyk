import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model, type Types } from 'mongoose';

export type UserStatus = 'active' | 'suspended' | 'pending';

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  name: string;
  status: UserStatus;
  roleIds: Types.ObjectId[];
  tenantId: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaBackupCodes?: string[];
  emailVerified?: Date;
  image?: string;
  lastLoginAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active',
    },
    roleIds: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    mfaBackupCodes: [{ type: String }],
    emailVerified: { type: Date },
    image: { type: String },
    lastLoginAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export type UserModel = Model<IUser>;

export function getUserModel(mongoose: typeof import('mongoose')): UserModel {
  return (mongoose.models.User as UserModel) ?? mongoose.model<IUser>('User', userSchema);
}
