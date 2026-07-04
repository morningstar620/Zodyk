import './load-env.js';
import { createHash } from 'node:crypto';
import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import {
  buildThemeObjectKey,
  buildThemeStoragePrefix,
  putObject,
  requireStorageConfig,
} from '@zodyk/media';
import { requireEnv } from './load-env.js';

async function main() {
  requireEnv('MONGODB_URI');
  await requireStorageConfig();

  const uri = process.env.MONGODB_URI!;
  await connectDatabase(uri);
  const { Theme, ThemeFile } = getModels();

  const themes = await Theme.find({});
  for (const theme of themes) {
    const themeId = theme._id.toString();
    const tenantId = theme.tenantId ?? DEFAULT_TENANT_ID;
    const prefix = buildThemeStoragePrefix(tenantId, themeId);

    if (!theme.storagePrefix) {
      theme.storagePrefix = prefix;
      await theme.save();
    }

    const files = await ThemeFile.find({ themeId: theme._id });
    for (const file of files) {
      if (file.r2Key && !file.content) continue;

      const content = file.content;
      if (!content) {
        console.warn(`Skipping ${file.path} — no content or r2Key`);
        continue;
      }

      const r2Key = buildThemeObjectKey(tenantId, themeId, file.path);
      await putObject(r2Key, content, file.contentType || 'text/plain');
      file.r2Key = r2Key;
      file.size = Buffer.byteLength(content, 'utf8');
      file.checksum = createHash('sha256').update(content).digest('hex');
      file.content = undefined;
      await file.save();
      console.log(`Migrated ${file.path} → ${r2Key}`);
    }
  }

  console.log('Theme R2 migration complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
