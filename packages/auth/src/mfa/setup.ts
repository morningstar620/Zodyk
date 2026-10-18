import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const BACKUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

export function getMfaUri(email: string, secret: string): string {
  return authenticator.keyuri(email, 'Zodyk', secret);
}

export async function generateMfaQrCode(email: string, secret: string): Promise<string> {
  const uri = getMfaUri(email, secret);
  return QRCode.toDataURL(uri);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return authenticator.verify({ token: code, secret });
}

function randomBackupCode(length = 8): string {
  const alphabet = BACKUP_ALPHABET;
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  const chars: string[] = [];
  while (chars.length < length) {
    const bytes = crypto.randomBytes(length);
    for (const byte of bytes) {
      if (byte < limit) {
        const char = alphabet[byte % alphabet.length];
        if (char) chars.push(char);
        if (chars.length === length) break;
      }
    }
  }
  return chars.join('');
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => randomBackupCode());
}
