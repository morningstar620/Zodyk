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
      const existingKey = file.storageKey || file.r2Key;
      if (existingKey && !file.content) {
        if (!file.storageKey && file.r2Key) {
          file.storageKey = file.r2Key;
          await file.save();
          console.log(`Renamed key field for ${file.path}`);
        }
        continue;
      }

      const content = file.content;
      if (!content) {
        console.warn(`Skipping ${file.path} — no content or storageKey`);
        continue;
      }

      const storageKey = buildThemeObjectKey(tenantId, themeId, file.path);
      await putObject(storageKey, content, file.contentType || 'text/plain');
      file.storageKey = storageKey;
      file.r2Key = undefined;
      file.size = Buffer.byteLength(content, 'utf8');
      file.checksum = createHash('sha256').update(content).digest('hex');
      file.content = undefined;
      await file.save();
      console.log(`Migrated ${file.path} → ${storageKey}`);
    }
  }

  console.log('Theme storageKey migration complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
