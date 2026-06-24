import { connectDatabase, getModels } from '@zodyk/database';
import crypto from 'crypto';
import { decrypt, encrypt } from '../security/encryption';
import { hashPassword, verifyPassword } from '../security/password';
import { verifyTotpCode } from './setup';

export async function verifyMfaCode(
  userId: string,
  code: string,
): Promise<{ valid: boolean; usedBackupCode?: boolean }> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const { User } = getModels();
  const user = await User.findById(userId);
  if (!user?.mfaEnabled || !user.mfaSecret) {
    return { valid: false };
  }

  const secret = decrypt(user.mfaSecret);
  if (verifyTotpCode(secret, code)) {
    return { valid: true };
  }

  if (user.mfaBackupCodes?.length) {
    for (let i = 0; i < user.mfaBackupCodes.length; i++) {
      const storedHash = user.mfaBackupCodes[i];
      if (storedHash && (await verifyPassword(code.toUpperCase(), storedHash))) {
        user.mfaBackupCodes.splice(i, 1);
        await user.save();
        return { valid: true, usedBackupCode: true };
      }
    }
  }

  return { valid: false };
}

export async function enableMfa(
  userId: string,
  secret: string,
  code: string,
): Promise<{ backupCodes: string[] }> {
  if (!verifyTotpCode(secret, code)) {
    throw new Error('Invalid verification code');
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const { User } = getModels();
  const { generateBackupCodes } = await import('./setup');

  const backupCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(backupCodes.map((c) => hashPassword(c)));

  await User.findByIdAndUpdate(userId, {
    mfaEnabled: true,
    mfaSecret: encrypt(secret),
    mfaBackupCodes: hashedCodes,
  });

  return { backupCodes };
}

export async function disableMfa(userId: string): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const { User } = getModels();

  await User.findByIdAndUpdate(userId, {
    mfaEnabled: false,
    mfaSecret: undefined,
    mfaBackupCodes: [],
  });
}

export async function createMfaChallenge(userId: string): Promise<string> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const { MfaChallenge } = getModels();

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 5 * 60 * 1000);

  await MfaChallenge.create({ userId, token, expires });
  return token;
}

export async function consumeMfaChallenge(token: string): Promise<string | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const { MfaChallenge } = getModels();

  const challenge = await MfaChallenge.findOneAndDelete({
    token,
    expires: { $gt: new Date() },
  });

  return challenge ? challenge.userId.toString() : null;
}
