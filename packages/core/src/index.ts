import { z } from 'zod';

export const ZODYK_VERSION = '0.1.0';

export const DEFAULT_TENANT_ID = 'default';

export const tenantContextSchema = z.object({
  tenantId: z.string().min(1),
});

export type TenantContext = z.infer<typeof tenantContextSchema>;

export * from './permissions';
export * from './schemas/auth';
export * from './schemas/user';
export * from './meta';
export * from './entity';
export * from './media';
export * from './theme';
export * from './page';
export * from './menu';
export { z };
