import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireEnv } from './load-env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEME_DIR = join(__dirname, '../../themes/zodyk-starter');

/** Same rules as theme-engine `resolveThemeStorageKind`, without loading that package. */
function themeStorageKind(): 'local' | 'r2' {
  const explicit = process.env.THEME_STORAGE?.trim().toLowerCase();
  if (explicit === 'local' || explicit === 'r2') return explicit;
  return process.env.NODE_ENV === 'production' ? 'r2' : 'local';
}

export async function seedTheme(): Promise<void> {
  requireEnv('MONGODB_URI');

  // Fail before installThemeFromDirectory writes a live theme row.
  if (themeStorageKind() === 'r2') {
    const { requireStorageConfig } = await import('@zodyk/media');
    await requireStorageConfig();
  }

  const { installThemeFromDirectory } = await import('@zodyk/theme-engine');
  const result = await installThemeFromDirectory(THEME_DIR, {
    name: 'Zodyk Starter',
    slug: 'zodyk-starter',
    version: '1.0.0',
    activate: true,
  });
  console.log(`Seeded theme: zodyk-starter (${result.themeId})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedTheme().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
