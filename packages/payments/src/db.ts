import { connectDatabase, getModels } from '@zodyk/database';

export async function ensureDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  return getModels();
}
