import type { UpdateSystemEntityInput } from '@zodyk/core';
import { z } from '@zodyk/core';
import { createSystemEntitySchema } from '@zodyk/core';
import type { SystemEntityDefinition, SystemRecordRow } from './system-entity-types';

type CreateSystemEntityBody = z.input<typeof createSystemEntitySchema>;

const BASE = '/api/v1/system-entities';

export async function fetchSystemEntities(): Promise<SystemEntityDefinition[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Failed to load system entities');
  return res.json();
}

export async function fetchSystemEntity(slug: string): Promise<SystemEntityDefinition> {
  const res = await fetch(`${BASE}/${slug}`);
  if (!res.ok) throw new Error('Failed to load system entity');
  return res.json();
}

export async function createSystemEntity(
  body: CreateSystemEntityBody,
): Promise<SystemEntityDefinition> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to create system entity');
  return json;
}

export async function updateSystemEntity(
  slug: string,
  body: UpdateSystemEntityInput,
): Promise<SystemEntityDefinition> {
  const res = await fetch(`${BASE}/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to update system entity');
  return json;
}

export async function deleteSystemEntity(slug: string): Promise<void> {
  const res = await fetch(`${BASE}/${slug}`, { method: 'DELETE' });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error ?? 'Failed to delete system entity');
  }
}

export async function fetchSystemRecords(
  slug: string,
  params?: Record<string, string>,
): Promise<{ data: SystemRecordRow[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const query = new URLSearchParams(params);
  const res = await fetch(`${BASE}/${slug}/records?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load records');
  return res.json();
}

export async function fetchSystemRecord(slug: string, id: string): Promise<SystemRecordRow> {
  const res = await fetch(`${BASE}/${slug}/records/${id}`);
  if (!res.ok) throw new Error('Failed to load record');
  return res.json();
}

export async function createSystemRecord(
  slug: string,
  body: { status?: string; data: Record<string, unknown> },
): Promise<SystemRecordRow> {
  const res = await fetch(`${BASE}/${slug}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to create record');
  return json;
}

export async function updateSystemRecord(
  slug: string,
  id: string,
  body: { status?: string; data?: Record<string, unknown> },
): Promise<SystemRecordRow> {
  const res = await fetch(`${BASE}/${slug}/records/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to update record');
  return json;
}

export async function bulkSystemRecordsAction(
  slug: string,
  body: { ids: string[]; action: 'delete' | 'restore' | 'archive' },
): Promise<{ success: boolean; modified: number }> {
  const res = await fetch(`${BASE}/${slug}/records/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Bulk action failed');
  return json;
}

export async function fetchEntityTargets(): Promise<
  { slug: string; name: string; category: 'meta_object' | 'system' }[]
> {
  const [meta, system] = await Promise.all([
    fetch('/api/v1/meta-objects').then((r) => r.json()),
    fetchSystemEntities(),
  ]);
  const metaTargets = (Array.isArray(meta) ? meta : []).map((m: { slug: string; name: string }) => ({
    slug: m.slug,
    name: m.name,
    category: 'meta_object' as const,
  }));
  const systemTargets = system.map((s) => ({
    slug: s.slug,
    name: s.name,
    category: 'system' as const,
  }));
  return [...metaTargets, ...systemTargets];
}
