import { authenticator } from 'otplib';
import QRCode from 'qrcode';

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

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}
