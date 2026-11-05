import { DEFAULT_ROLE_PERMISSIONS, ROLE_SLUGS } from '@zodyk/core';
import { requireEnv } from './load-env.js';

export interface AdminPermissionPlan {
  roleId: string;
  tenantId: string;
  missing: string[];
}

/**
 * Add any canonical Admin permissions that are missing from existing built-in
 * Admin roles. The migration is additive and idempotent: existing grants are
 * never removed, and a second run performs no writes.
 *
 * Roles explicitly marked isSystem: false are skipped. A legacy row with no
 * isSystem field is treated as built-in and upgraded, so a pre-flag custom
 * role using the admin slug would also be included.
 *
 * It only runs once PR #59 (the Admin `media:*` default) is part of the checked
 * out code. That guard prevents a later `seedRoles()` from silently removing a
 * grant that the defaults do not yet contain.
 */
export async function migrateAdminMedia(apply = false): Promise<AdminPermissionPlan[]> {
  const canonical = DEFAULT_ROLE_PERMISSIONS[ROLE_SLUGS.ADMIN];
  if (!canonical.includes('media:*')) {
    throw new Error(
      'Admin defaults do not include media:*. Integrate PR #59 before applying this migration.',
    );
  }

  const uri = requireEnv('MONGODB_URI');
  const { connectDatabase, disconnectDatabase, getModels } = await import('@zodyk/database');
  await connectDatabase(uri);
  try {
    const { Role } = getModels();
    const roles = await Role.find({
      slug: ROLE_SLUGS.ADMIN,
      isSystem: { $ne: false },
    }).lean();
    if (roles.length === 0) {
      throw new Error('No built-in Admin role found; no changes made.');
    }

    const plan = roles.map((role) => {
      const current = new Set(role.permissions ?? []);
      return {
        roleId: role._id.toString(),
        tenantId: role.tenantId,
        missing: canonical.filter((permission) => !current.has(permission)),
      };
    });

    for (const item of plan) {
      if (item.missing.length === 0) {
        console.log(
          `Built-in Admin (${item.tenantId}) already has the canonical permissions; no changes needed.`,
        );
        continue;
      }

      if (!apply) {
        console.log(
          `Dry run: built-in Admin (${item.tenantId}) is missing: ${item.missing.join(', ')}. No changes made.`,
        );
        continue;
      }

      const result = await Role.updateOne(
        { _id: item.roleId, isSystem: { $ne: false } },
        {
          $addToSet: { permissions: { $each: item.missing } },
          $set: { isSystem: true },
        },
      );
      if (result.matchedCount !== 1) {
        throw new Error(
          `Built-in Admin role ${item.roleId} changed during migration; no grant added.`,
        );
      }
      console.log(
        result.modifiedCount
          ? `Added ${item.missing.join(', ')} to built-in Admin (${item.tenantId}).`
          : `Built-in Admin (${item.tenantId}) already had the canonical permissions; no changes needed.`,
      );
    }

    return plan;
  } finally {
    await disconnectDatabase();
  }
}

/** True when at least one built-in Admin role is missing canonical permissions. */
export function hasPermissionDrift(plan: AdminPermissionPlan[]): boolean {
  return plan.some((item) => item.missing.length > 0);
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const check = process.argv.includes('--check');
  if (apply && check) {
    throw new Error('Use either --apply or --check, not both.');
  }

  const plan = await migrateAdminMedia(apply);
  if (check && hasPermissionDrift(plan)) {
    console.error('Built-in Admin roles are missing canonical permissions.');
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
