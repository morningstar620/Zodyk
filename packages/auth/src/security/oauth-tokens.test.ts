import { beforeEach, describe, expect, it } from 'vitest';
import { decryptOAuthSecret, encryptOAuthSecrets } from './oauth-tokens';

describe('oauth token encryption', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
  });

  it('stores access, refresh, and id tokens so the plaintext is not recoverable from the field', () => {
    const stored = encryptOAuthSecrets({
      access_token: 'ya29.secret-access',
      refresh_token: 'refresh-secret',
      id_token: 'header.payload.signature',
    });

    expect(stored.access_token?.startsWith('enc:v1:')).toBe(true);
    expect(stored.access_token).not.toContain('secret-access');
    expect(stored.refresh_token).not.toContain('refresh-secret');
    expect(stored.id_token).not.toContain('header.payload');
    expect(decryptOAuthSecret(stored.access_token!)).toBe('ya29.secret-access');
    expect(decryptOAuthSecret(stored.refresh_token!)).toBe('refresh-secret');
    expect(decryptOAuthSecret(stored.id_token!)).toBe('header.payload.signature');
  });

  it('leaves legacy plaintext readable', () => {
    expect(decryptOAuthSecret('legacy-plaintext-token')).toBe('legacy-plaintext-token');
  });
});
