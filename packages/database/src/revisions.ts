import { DEFAULT_TENANT_ID, stableStringify } from '@zodyk/core';
import mongoose from 'mongoose';
import { getContentRevisionModel, type RevisionResourceType } from './models/content-revision';

function revisionModel() {
  return getContentRevisionModel(mongoose);
}

export async function recordContentRevision(input: {
  resourceType: RevisionResourceType;
  resourceId: string;
  snapshot: Record<string, unknown>;
  createdBy?: string;
}) {
  const ContentRevision = revisionModel();
  const latest = await ContentRevision.findOne({
    tenantId: DEFAULT_TENANT_ID,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
  })
    .sort({ revision: -1 })
    .lean();

  if (latest && stableStringify(latest.snapshot) === stableStringify(input.snapshot)) {
    return latest;
  }

  return ContentRevision.create({
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    tenantId: DEFAULT_TENANT_ID,
    revision: (latest?.revision ?? 0) + 1,
    snapshot: input.snapshot,
    createdBy: input.createdBy,
  });
}

export async function listContentRevisionDocs(
  resourceType: RevisionResourceType,
  resourceId: string,
) {
  const ContentRevision = revisionModel();
  return ContentRevision.find({
    tenantId: DEFAULT_TENANT_ID,
    resourceType,
    resourceId,
  })
    .sort({ revision: -1 })
    .limit(50)
    .lean();
}

export async function findContentRevision(
  resourceType: RevisionResourceType,
  resourceId: string,
  revisionId: string,
) {
  const ContentRevision = revisionModel();
  return ContentRevision.findOne({
    _id: revisionId,
    tenantId: DEFAULT_TENANT_ID,
    resourceType,
    resourceId,
  }).lean();
}

export async function deleteContentRevisions(
  resourceType: RevisionResourceType,
  resourceId: string,
) {
  const ContentRevision = revisionModel();
  await ContentRevision.deleteMany({
    tenantId: DEFAULT_TENANT_ID,
    resourceType,
    resourceId,
  });
}
