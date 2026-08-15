import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '../../.env') });
loadEnv({ path: resolve(process.cwd(), '.env') });

function parseOrigins(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 5002);

export const env = {
  port: Number.isFinite(port) ? port : 5002,
  mongodbUri: process.env.MONGODB_URI ?? '',
  redisUrl: process.env.REDIS_URL,
  authSecret: process.env.AUTH_SECRET ?? '',
  apiUrl: process.env.API_URL ?? `http://localhost:${port}`,
  corsOrigins: [
    ...new Set(
      parseOrigins(
        process.env.CORS_ORIGINS ??
          [process.env.ADMIN_URL, process.env.WEBSITE_URL, process.env.AUTH_URL]
            .filter(Boolean)
            .join(','),
      ),
    ),
  ],
  bodyLimit: process.env.API_BODY_LIMIT ?? '100mb',
  requestTimeoutMs: Number(process.env.API_REQUEST_TIMEOUT_MS ?? 120_000),
};
