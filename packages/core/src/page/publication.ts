import type { PageStatus } from './page';

export type PublicationFields = {
  status: PageStatus;
  /** Omitted when the existing publish date should be left alone. */
  publishedAt?: string | null;
  scheduledAt: string | null;
};

/**
 * Map the visibility card onto page status fields.
 * A future date schedules the page; a past or current date publishes it.
 */
export function resolvePagePublication(input: {
  visible: boolean;
  publishedAt?: string | null;
  archived?: boolean;
  now?: Date;
}): PublicationFields {
  const now = input.now ?? new Date();
  if (!input.visible) {
    return {
      status: input.archived ? 'archived' : 'draft',
      scheduledAt: null,
    };
  }

  const when = input.publishedAt ? new Date(input.publishedAt) : now;
  const iso = Number.isNaN(when.getTime()) ? now.toISOString() : when.toISOString();
  if (!Number.isNaN(when.getTime()) && when.getTime() > now.getTime()) {
    return { status: 'scheduled', publishedAt: null, scheduledAt: iso };
  }
  return { status: 'published', publishedAt: iso, scheduledAt: null };
}

/**
 * Make stored status and dates consistent. A schedule whose time has already
 * arrived is published at that time so a late reader does not leave it pending.
 */
export function normalizePublication(input: {
  status: PageStatus;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  now?: Date;
}): { status: PageStatus; publishedAt: string | null; scheduledAt: string | null } {
  const now = input.now ?? new Date();
  let status = input.status;
  let publishedAt = input.publishedAt ?? null;
  let scheduledAt = input.scheduledAt ?? null;

  if (status === 'scheduled') {
    const when = scheduledAt ? new Date(scheduledAt) : null;
    if (!when || Number.isNaN(when.getTime()) || when.getTime() <= now.getTime()) {
      status = 'published';
      publishedAt = when && !Number.isNaN(when.getTime()) ? when.toISOString() : now.toISOString();
      scheduledAt = null;
    } else {
      publishedAt = null;
      scheduledAt = when.toISOString();
    }
  } else {
    scheduledAt = null;
    if (status === 'published' && !publishedAt) {
      publishedAt = now.toISOString();
    }
  }

  return { status, publishedAt, scheduledAt };
}

export function isDueScheduled(
  status: string,
  scheduledAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (status !== 'scheduled' || !scheduledAt) return false;
  const time =
    scheduledAt instanceof Date ? scheduledAt.getTime() : new Date(scheduledAt).getTime();
  return !Number.isNaN(time) && time <= now.getTime();
}
