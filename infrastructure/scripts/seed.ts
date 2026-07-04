import './load-env.js';

async function main() {
  const { createIndexes } = await import('./create-indexes.js');
  const { migrateEntryHandles } = await import('./migrate-entry-handles.js');
  const { migrateThemeStatus } = await import('./migrate-theme-status.js');
  const { seedRoles } = await import('./seed-roles.js');
  const { seedAdmin } = await import('./seed-admin.js');
  const { seedMetaObjects } = await import('./seed-meta-objects.js');
  const { seedTheme } = await import('./seed-theme.js');
  const { seedPages } = await import('./seed-pages.js');
  const { seedMenus } = await import('./seed-menus.js');

  await migrateEntryHandles();
  await migrateThemeStatus();
  await createIndexes();
  await seedRoles();
  await seedAdmin();
  await seedMetaObjects();
  await seedTheme();
  await seedPages();
  await seedMenus();
  console.log('Seed complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
