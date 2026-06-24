import { requireEnv } from './load-env.js';
import { randomBytes } from 'node:crypto';

export async function migrateThemeStatus(): Promise<void> {
  requireEnv('MONGODB_URI');

  const { connectDatabase, disconnectDatabase, getModels } = await import('@zodyk/database');
  await connectDatabase(process.env.MONGODB_URI!);
  const { Theme } = getModels();

  const themes = await Theme.find({});
  for (const theme of themes) {
    let changed = false;
    if (!theme.previewToken) {
      theme.previewToken = randomBytes(24).toString('hex');
      changed = true;
    }
    if (!theme.status) {
      theme.status = theme.isActive ? 'live' : 'draft';
      changed = true;
    }
    if (theme.status === 'live' && !theme.isActive) {
      theme.isActive = true;
      changed = true;
    }
    if (theme.status !== 'live' && theme.isActive) {
      theme.isActive = false;
      changed = true;
    }
    if (changed) await theme.save();
  }

  console.log(`Migrated ${themes.length} theme(s)`);
  await disconnectDatabase();
}
