import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { requireEnv } from './load-env.js';

export async function seedMenus(): Promise<void> {
  requireEnv('MONGODB_URI');

  const { connectDatabase, disconnectDatabase, getModels } = await import('@zodyk/database');
  await connectDatabase(process.env.MONGODB_URI!);
  const { Menu } = getModels();

  const mainMenu = {
    title: 'Main',
    handle: 'main',
    tenantId: DEFAULT_TENANT_ID,
    items: [
      {
        id: 'home',
        label: 'Home',
        url: '/',
        type: 'home' as const,
        items: [],
      },
      {
        id: 'about',
        label: 'About',
        url: '/about',
        type: 'page' as const,
        resourceHandle: 'about',
        items: [],
      },
      {
        id: 'contact',
        label: 'Contact',
        url: '/contact',
        type: 'page' as const,
        resourceHandle: 'contact',
        items: [],
      },
    ],
  };

  await Menu.findOneAndUpdate(
    { handle: 'main', tenantId: DEFAULT_TENANT_ID },
    mainMenu,
    { upsert: true, new: true },
  );
  console.log('Seeded menu: main');

  await disconnectDatabase();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMenus().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
