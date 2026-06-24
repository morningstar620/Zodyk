import { DEFAULT_TENANT_ID, ROLE_SLUGS } from '@zodyk/core';
import { requireEnv } from './load-env.js';

export async function seedAdmin(): Promise<void> {
  requireEnv('MONGODB_URI');

  const email = process.env.ADMIN_EMAIL ?? 'admin@zodyk.local';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@12345';
  const name = process.env.ADMIN_NAME ?? 'Super Admin';

  const { hashPassword } = await import('@zodyk/auth');
  const { connectDatabase, disconnectDatabase, getModels } = await import('@zodyk/database');

  await connectDatabase(process.env.MONGODB_URI!);
  const { User, Role } = getModels();

  const superAdminRole = await Role.findOne({
    slug: ROLE_SLUGS.SUPER_ADMIN,
    tenantId: DEFAULT_TENANT_ID,
  });

  if (!superAdminRole) {
    throw new Error('Super admin role not found. Run seed-roles first.');
  }

  const existing = await User.findOne({ email: email.toLowerCase(), tenantId: DEFAULT_TENANT_ID });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    await disconnectDatabase();
    return;
  }

  const passwordHash = await hashPassword(password);
  await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    roleIds: [superAdminRole._id],
    status: 'active',
    tenantId: DEFAULT_TENANT_ID,
    emailVerified: new Date(),
  });

  console.log(`Created admin user: ${email}`);
  await disconnectDatabase();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdmin().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
