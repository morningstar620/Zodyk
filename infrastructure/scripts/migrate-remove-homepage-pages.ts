import { requireEnv } from './load-env.js';

export async function removeHomepagePages(): Promise<void> {
  requireEnv('MONGODB_URI');

  const { connectDatabase, disconnectDatabase, getModels } = await import('@zodyk/database');
  await connectDatabase(process.env.MONGODB_URI!);
  const { Page } = getModels();

  const deleted = await Page.deleteMany({ isHomepage: true });
  const cleared = await Page.updateMany(
    { isHomepage: { $exists: true } },
    { $unset: { isHomepage: '' } },
  );

  console.log(
    `Removed ${deleted.deletedCount ?? 0} homepage page(s); cleared isHomepage on ${cleared.modifiedCount ?? 0} page(s)`,
  );

  await disconnectDatabase();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  removeHomepagePages().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
