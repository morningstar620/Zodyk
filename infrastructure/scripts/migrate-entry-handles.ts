import { DEFAULT_TENANT_ID, generateEntryHandle } from '@zodyk/core';
import { requireEnv } from './load-env.js';

export async function migrateEntryHandles(): Promise<void> {
  requireEnv('MONGODB_URI');

  const { connectDatabase, disconnectDatabase, getModels } = await import('@zodyk/database');
  await connectDatabase(process.env.MONGODB_URI!);
  const { MetaObjectEntry } = getModels();

  const entries = await MetaObjectEntry.find({
    tenantId: DEFAULT_TENANT_ID,
    $or: [{ handle: { $exists: false } }, { handle: null }, { handle: '' }],
  });

  for (const entry of entries) {
    const baseHandle = generateEntryHandle(entry.data as Record<string, unknown>);
    let handle = baseHandle;
    let suffix = 1;
    while (
      await MetaObjectEntry.findOne({
        tenantId: DEFAULT_TENANT_ID,
        metaObjectSlug: entry.metaObjectSlug,
        handle,
        _id: { $ne: entry._id },
      })
    ) {
      handle = `${baseHandle}-${suffix++}`;
    }
    entry.handle = handle;
    await entry.save();
  }

  if (entries.length > 0) {
    console.log(`Backfilled handles for ${entries.length} meta object entries`);
  }

  await disconnectDatabase();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateEntryHandles().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
