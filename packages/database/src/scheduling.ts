import {
  DEFAULT_TENANT_ID,
  isDueScheduled,
  snapshotMetaEntryContent,
  snapshotPageContent,
} from '@zodyk/core';
import mongoose from 'mongoose';
import { getMetaObjectEntryModel } from './models/meta-object-entry';
import { getPageModel } from './models/page';
import { recordContentRevision } from './revisions';

/**
 * Publish scheduled pages and meta entries whose scheduledAt has arrived.
 * Called on read so a due page goes live without a separate worker.
 */
export async function promoteDueScheduledContent(now = new Date()): Promise<{
  pages: number;
  entries: number;
}> {
  const Page = getPageModel(mongoose);
  const MetaObjectEntry = getMetaObjectEntryModel(mongoose);

  const [duePages, dueEntries] = await Promise.all([
    Page.find({
      tenantId: DEFAULT_TENANT_ID,
      status: 'scheduled',
      scheduledAt: { $lte: now },
    }),
    MetaObjectEntry.find({
      tenantId: DEFAULT_TENANT_ID,
      status: 'scheduled',
      scheduledAt: { $lte: now },
      deletedAt: { $exists: false },
    }),
  ]);

  let pages = 0;
  for (const page of duePages) {
    if (!isDueScheduled(page.status, page.scheduledAt, now)) continue;
    const publishedAt = page.scheduledAt ?? now;
    page.status = 'published';
    page.publishedAt = publishedAt;
    await page.save();
    await Page.updateOne({ _id: page._id }, { $unset: { scheduledAt: 1 } });
    await recordContentRevision({
      resourceType: 'page',
      resourceId: page._id.toString(),
      snapshot: snapshotPageContent({
        title: page.title,
        slug: page.slug,
        handle: page.handle,
        parentId: page.parentId,
        templateSuffix: page.templateSuffix,
        body: page.body,
        seo: page.seo,
        status: page.status,
        publishedAt,
        scheduledAt: null,
      }),
    });
    pages += 1;
  }

  let entries = 0;
  for (const entry of dueEntries) {
    if (!isDueScheduled(entry.status, entry.scheduledAt, now)) continue;
    const publishedAt = entry.scheduledAt ?? now;
    entry.status = 'published';
    entry.publishedAt = publishedAt;
    await entry.save();
    await MetaObjectEntry.updateOne({ _id: entry._id }, { $unset: { scheduledAt: 1 } });
    await recordContentRevision({
      resourceType: 'meta_entry',
      resourceId: entry._id.toString(),
      snapshot: snapshotMetaEntryContent({
        handle: entry.handle,
        templateSuffix: entry.templateSuffix,
        status: entry.status,
        locale: entry.locale,
        data: entry.data,
        translations: entry.translations,
        publishedAt,
        scheduledAt: null,
      }),
    });
    entries += 1;
  }

  return { pages, entries };
}

export async function findNextScheduledAt(now = new Date()): Promise<Date | null> {
  const Page = getPageModel(mongoose);
  const MetaObjectEntry = getMetaObjectEntryModel(mongoose);
  const [page, entry] = await Promise.all([
    Page.findOne({
      tenantId: DEFAULT_TENANT_ID,
      status: 'scheduled',
      scheduledAt: { $gt: now },
    })
      .sort({ scheduledAt: 1 })
      .select('scheduledAt')
      .lean(),
    MetaObjectEntry.findOne({
      tenantId: DEFAULT_TENANT_ID,
      status: 'scheduled',
      scheduledAt: { $gt: now },
      deletedAt: { $exists: false },
    })
      .sort({ scheduledAt: 1 })
      .select('scheduledAt')
      .lean(),
  ]);

  const times = [page?.scheduledAt, entry?.scheduledAt].filter(
    (value): value is Date => value instanceof Date,
  );
  if (times.length === 0) return null;
  return times.reduce((earliest, value) => (value < earliest ? value : earliest));
}
