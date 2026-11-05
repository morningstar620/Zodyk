# Infrastructure Scripts

Placeholder for seed, migration, and deployment utilities.

Planned scripts (v1.0+):

- Database seeding (roles, settings, default theme)
- Index creation
- Admin user bootstrap

## Built-in Admin permissions migration

The delegation checks require every built-in Admin role to cover the roles it
assigns. Seeded Admin roles created before PR #59 are missing `media:*`, so the
release order is:

1. Integrate PR #59 (the Admin `media:*` default) into the release.
2. Run this migration from a checkout containing both changes.
3. Deploy the delegation checks.

The migration compares each built-in Admin role (`slug: admin`,
`isSystem: {$ne: false}`) against `DEFAULT_ROLE_PERMISSIONS.admin` and adds only
the missing permissions. It never removes permissions, never creates a role, and
never touches custom roles. A second run performs no writes. It covers every
tenant that has a built-in Admin role.

Use the intended `MONGODB_URI` and back up the database first:

```sh
# Report drift without writing. Exits 1 when any role is missing permissions.
pnpm migrate:admin-media --check

# Preview the exact permissions that would be added.
pnpm migrate:admin-media

# Apply the additive update.
pnpm migrate:admin-media --apply
```

`--apply` is rejected unless the checked-out Admin defaults already include
`media:*`. That guard prevents the migration from running before PR #59 and
prevents a later `seedRoles()` from silently removing a grant that the defaults
do not contain.

Do **not** run `pnpm seed` in production for this change: it also runs
`seedAdmin()`, which can create a default-password admin when none exists, and
seeds pages, menus, and themes. Use `migrate:admin-media` instead.
