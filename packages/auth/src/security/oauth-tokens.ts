import { decrypt, encrypt } from './encryption';

const PREFIX = 'enc:v1:';

export function encryptOAuthSecret(value: string): string {
  if (value.startsWith(PREFIX)) return value;
  return `${PREFIX}${encrypt(value)}`;
}

export function decryptOAuthSecret(value: string): string {
  if (!value.startsWith(PREFIX)) return value;
  return decrypt(value.slice(PREFIX.length));
}

export function encryptOAuthSecrets(account: {
  access_token?: string | null;
  refresh_token?: string | null;
  id_token?: string | null;
}): {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
} {
  return {
    access_token: account.access_token ? encryptOAuthSecret(account.access_token) : undefined,
    refresh_token: account.refresh_token ? encryptOAuthSecret(account.refresh_token) : undefined,
    id_token: account.id_token ? encryptOAuthSecret(account.id_token) : undefined,
  };
}
