import { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IVerificationToken extends Document {
  identifier: string;
  token: string;
  expires: Date;
}

const verificationTokenSchema = new Schema<IVerificationToken>({
  identifier: { type: String, required: true },
  token: { type: String, required: true },
  expires: { type: Date, required: true },
});

verificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true });

export type VerificationTokenModel = Model<IVerificationToken>;

export function getVerificationTokenModel(
  mongoose: typeof import('mongoose'),
): VerificationTokenModel {
  return (
    (mongoose.models.VerificationToken as VerificationTokenModel) ??
    mongoose.model<IVerificationToken>('VerificationToken', verificationTokenSchema)
  );
}

export interface ISession extends Document {
  sessionToken: string;
  userId: Types.ObjectId;
  expires: Date;
}

const sessionSchema = new Schema<ISession>({
  sessionToken: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expires: { type: Date, required: true },
});

export type SessionModel = Model<ISession>;

export function getSessionModel(mongoose: typeof import('mongoose')): SessionModel {
  return (
    (mongoose.models.Session as SessionModel) ?? mongoose.model<ISession>('Session', sessionSchema)
  );
}

export interface IPasswordResetToken extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  expires: Date;
  usedAt?: Date;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true },
  expires: { type: Date, required: true },
  usedAt: { type: Date },
});

passwordResetTokenSchema.index({ tokenHash: 1 }, { unique: true });
passwordResetTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetTokenModel = Model<IPasswordResetToken>;

export function getPasswordResetTokenModel(
  mongoose: typeof import('mongoose'),
): PasswordResetTokenModel {
  return (
    (mongoose.models.PasswordResetToken as PasswordResetTokenModel) ??
    mongoose.model<IPasswordResetToken>('PasswordResetToken', passwordResetTokenSchema)
  );
}

export interface IMfaChallenge extends Document {
  userId: Types.ObjectId;
  token: string;
  expires: Date;
}

const mfaChallengeSchema = new Schema<IMfaChallenge>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  expires: { type: Date, required: true },
});

mfaChallengeSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export type MfaChallengeModel = Model<IMfaChallenge>;

export function getMfaChallengeModel(mongoose: typeof import('mongoose')): MfaChallengeModel {
  return (
    (mongoose.models.MfaChallenge as MfaChallengeModel) ??
    mongoose.model<IMfaChallenge>('MfaChallenge', mfaChallengeSchema)
  );
}
