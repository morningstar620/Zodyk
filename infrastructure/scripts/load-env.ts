import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const envPath = resolve(rootDir, '.env');

config({ path: envPath });

export const ROOT_DIR = rootDir;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    if (!existsSync(envPath)) {
      console.error(`Missing ${name}. No .env file found at ${envPath}`);
      console.error('Create one with: cp .env.example .env');
    } else {
      console.error(`Missing ${name}. Add it to ${envPath}`);
    }
    process.exit(1);
  }
  return value;
}
