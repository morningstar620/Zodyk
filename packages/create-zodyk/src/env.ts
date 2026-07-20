import { randomBytes } from 'node:crypto';

export interface WizardValues {
  mongodbUri: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
  allowRegistration: boolean;
  redisUrl?: string;
  smtp?: {
    host: string;
    port: string;
    user: string;
    password: string;
    from: string;
  };
  r2?: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicUrl: string;
    endpoint: string;
  };
}

export interface GeneratedSecrets {
  authSecret: string;
  encryptionKey: string;
}

const ADMIN_URL = 'http://localhost:5001';
const WEBSITE_URL = 'http://localhost:5003';

export function generateSecrets(): GeneratedSecrets {
  return {
    // next-auth expects a sufficiently long random string.
    authSecret: randomBytes(32).toString('base64'),
    // 32 bytes -> 64 hex chars, used for encrypting secrets (e.g. MFA) at rest.
    encryptionKey: randomBytes(32).toString('hex'),
  };
}

/**
 * Build the map of env keys the setup wizard is responsible for. Any key not
 * present here is left at whatever the template's .env.example ships with.
 */
export function buildEnvValues(values: WizardValues, secrets: GeneratedSecrets): Record<string, string> {
  const map: Record<string, string> = {
    MONGODB_URI: values.mongodbUri,
    AUTH_SECRET: secrets.authSecret,
    AUTH_URL: ADMIN_URL,
    ENCRYPTION_KEY: secrets.encryptionKey,
    ADMIN_EMAIL: values.adminEmail,
    ADMIN_PASSWORD: values.adminPassword,
    ADMIN_NAME: values.adminName,
    ADMIN_URL,
    WEBSITE_URL,
    ALLOW_REGISTRATION: String(values.allowRegistration),
    NEXT_PUBLIC_ALLOW_REGISTRATION: String(values.allowRegistration),
  };

  if (values.redisUrl) {
    map.REDIS_URL = values.redisUrl;
  }

  if (values.smtp) {
    map.SMTP_HOST = values.smtp.host;
    map.SMTP_PORT = values.smtp.port;
    map.SMTP_USER = values.smtp.user;
    map.SMTP_PASSWORD = values.smtp.password;
    map.SMTP_FROM = values.smtp.from;
  }

  if (values.r2) {
    map.R2_ACCOUNT_ID = values.r2.accountId;
    map.R2_ACCESS_KEY_ID = values.r2.accessKeyId;
    map.R2_SECRET_ACCESS_KEY = values.r2.secretAccessKey;
    map.R2_BUCKET = values.r2.bucket;
    map.R2_PUBLIC_URL = values.r2.publicUrl;
    map.R2_ENDPOINT = values.r2.endpoint;
  }

  return map;
}

/**
 * Patch an .env.example style file with the provided values. Existing keys are
 * replaced in place; unknown managed keys are appended so nothing is silently
 * dropped if the template drifts.
 */
export function renderEnvFile(exampleContents: string, values: Record<string, string>): string {
  const remaining = new Set(Object.keys(values));

  const patched = exampleContents
    .split('\n')
    .map((line) => {
      const match = /^([A-Z0-9_]+)=/.exec(line);
      if (!match) return line;
      const key = match[1]!;
      if (!(key in values)) return line;
      remaining.delete(key);
      return `${key}=${values[key]}`;
    })
    .join('\n');

  if (remaining.size === 0) return patched;

  const extra = [...remaining].map((key) => `${key}=${values[key]}`).join('\n');
  const separator = patched.endsWith('\n') ? '' : '\n';
  return `${patched}${separator}${extra}\n`;
}

const FALLBACK_ENV_EXAMPLE = `# Database
MONGODB_URI=mongodb://localhost:27017/zodyk

# Cache
REDIS_URL=redis://localhost:6379

# Auth
AUTH_SECRET=change-me-in-production
AUTH_URL=${ADMIN_URL}

# Registration
ALLOW_REGISTRATION=false

# Bootstrap admin (used by pnpm seed)
ADMIN_EMAIL=admin@zodyk.local
ADMIN_PASSWORD=Admin@12345
ADMIN_NAME=Super Admin

# App URLs
ADMIN_URL=${ADMIN_URL}
WEBSITE_URL=${WEBSITE_URL}
NEXT_PUBLIC_ALLOW_REGISTRATION=false

# Email (magic links + password reset)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@zodyk.local

# Encryption key for secrets at rest
ENCRYPTION_KEY=change-me-32-byte-hex-key-for-dev-only00

# Theme storage: local (themes/) or r2
THEME_STORAGE=local
THEME_LOCAL_ROOT=themes

# Object storage (Cloudflare R2) — media; themes when THEME_STORAGE=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
R2_ENDPOINT=
MEDIA_STORAGE_QUOTA_BYTES=107374182400
`;

export function fallbackEnvExample(): string {
  return FALLBACK_ENV_EXAMPLE;
}
