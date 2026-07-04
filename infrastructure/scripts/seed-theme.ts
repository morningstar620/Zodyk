import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireStorageConfig } from '@zodyk/media';
import { requireEnv } from './load-env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEME_DIR = join(__dirname, '../../themes/zodyk-starter');

export async function seedTheme(): Promise<void> {
  requireEnv('MONGODB_URI');
  await requireStorageConfig();

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
