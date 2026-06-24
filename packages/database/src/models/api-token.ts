import { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IApiToken extends Document {
  userId: Types.ObjectId;
  name: string;
  tokenHash: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const apiTokenSchema = new Schema<IApiToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    tokenHash: { type: String, required: true },
    prefix: { type: String, required: true },
    scopes: [{ type: String }],
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);

apiTokenSchema.index({ tokenHash: 1 }, { unique: true });
apiTokenSchema.index({ userId: 1, revokedAt: 1 });

export type ApiTokenModel = Model<IApiToken>;

export function getApiTokenModel(mongoose: typeof import('mongoose')): ApiTokenModel {
  return (
    (mongoose.models.ApiToken as ApiTokenModel) ??
    mongoose.model<IApiToken>('ApiToken', apiTokenSchema)
  );
}
