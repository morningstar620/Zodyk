import {
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_TENANT_ID,
  ROLE_SLUGS,
} from '@zodyk/core';
import { requireEnv } from './load-env.js';

const ROLE_NAMES: Record<string, string> = {
  [ROLE_SLUGS.SUPER_ADMIN]: 'Super Admin',
  [ROLE_SLUGS.ADMIN]: 'Admin',
  [ROLE_SLUGS.EDITOR]: 'Editor',
  [ROLE_SLUGS.AUTHOR]: 'Author',
  [ROLE_SLUGS.VIEWER]: 'Viewer',
};

export async function seedRoles(): Promise<void> {
  requireEnv('MONGODB_URI');

  const { connectDatabase, disconnectDatabase, getModels } = await import('@zodyk/database');
  await connectDatabase(process.env.MONGODB_URI!);
  const { Role } = getModels();

  for (const slug of Object.values(ROLE_SLUGS)) {
    await Role.findOneAndUpdate(
      { slug, tenantId: DEFAULT_TENANT_ID },
      {
        name: ROLE_NAMES[slug],
        slug,
        permissions: DEFAULT_ROLE_PERMISSIONS[slug],
        isSystem: true,
        tenantId: DEFAULT_TENANT_ID,
      },
      { upsert: true, new: true },
    );
    console.log(`Seeded role: ${slug}`);
  }

  await disconnectDatabase();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedRoles().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
