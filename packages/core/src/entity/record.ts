import { z } from 'zod';

export const systemRecordStatusSchema = z.enum(['active', 'archived', 'draft']);

export const createSystemRecordSchema = z.object({
  status: systemRecordStatusSchema.default('active'),
  data: z.record(z.unknown()),
});

export const updateSystemRecordSchema = z.object({
  status: systemRecordStatusSchema.optional(),
  data: z.record(z.unknown()).optional(),
});

export const bulkSystemRecordIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export const bulkSystemRecordActionSchema = bulkSystemRecordIdsSchema.extend({
  action: z.enum(['delete', 'restore', 'archive']),
});

export type SystemRecordStatus = z.infer<typeof systemRecordStatusSchema>;
export type CreateSystemRecordInput = z.infer<typeof createSystemRecordSchema>;
export type UpdateSystemRecordInput = z.infer<typeof updateSystemRecordSchema>;
export type BulkSystemRecordActionInput = z.infer<typeof bulkSystemRecordActionSchema>;

export function generateRecordLabel(data: Record<string, unknown>): string {
  const candidates = ['title', 'name', 'label', 'subject', 'reference'];
  for (const key of candidates) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return 'Untitled record';
}
