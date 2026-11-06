# Infrastructure Scripts

Database bootstrap and migration utilities. Run these commands from the repository root.

## Commands

- `pnpm seed` creates indexes, runs the entry-handle and theme-status migrations, then seeds roles, the admin user, meta objects, the default theme, pages, and menus.
- `pnpm migrate:themes-r2` runs `migrate-themes-to-r2.ts`.
- `pnpm migrate:remove-homepage` runs `migrate-remove-homepage-pages.ts`.

The seed command also uses `create-indexes.ts`, `migrate-entry-handles.ts`, and `migrate-theme-status.ts`. Seed steps are implemented in `seed-roles.ts`, `seed-admin.ts`, `seed-meta-objects.ts`, `seed-theme.ts`, `seed-pages.ts`, and `seed-menus.ts`.

Other migration utilities in this directory (`migrate-entry-handles.ts` and `migrate-theme-status.ts`) currently run as part of `pnpm seed`; they do not have separate root package scripts.
