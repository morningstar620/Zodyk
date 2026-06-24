import { requireEnv } from './load-env.js';

export async function createIndexes(): Promise<void> {
  requireEnv('MONGODB_URI');

  const { connectDatabase, disconnectDatabase, ensureIndexes } = await import('@zodyk/database');
  await connectDatabase(process.env.MONGODB_URI!);
  await ensureIndexes();
  console.log('Database indexes created');
  await disconnectDatabase();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createIndexes().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
