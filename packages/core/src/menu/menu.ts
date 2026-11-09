import { z } from 'zod';

export const MAX_MENU_DEPTH = 3;

export const menuItemTypeSchema = z.enum(['home', 'page', 'meta_archive', 'meta_entry', 'http']);

export type MenuItemType = z.infer<typeof menuItemTypeSchema>;

export interface MenuItemInput {
  id?: string;
  label: string;
  url: string;
  type: MenuItemType;
  resourceId?: string;
  resourceHandle?: string;
  metaType?: string;
  items?: MenuItemInput[];
}

/**
 * Menu links may only be absolute http(s) URLs, root-relative paths, or in-page
 * fragments. Anything else (notably `javascript:` and quote/angle-bracket
 * payloads) is rejected so it cannot become an executable href.
 */
const MENU_URL_PATTERN = /^(?:https?:\/\/|#|\/(?!\/))/i;
const MENU_URL_FORBIDDEN = /[<>"'\\\s]/;

function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function assertSafeMenuUrl(url: string, ctx: z.RefinementCtx): void {
  const trimmed = url.trim();
  if (!MENU_URL_PATTERN.test(trimmed)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Menu URL must be an http(s) URL, a root-relative path, or a fragment',
      path: ['url'],
    });
    return;
  }
  if (MENU_URL_FORBIDDEN.test(trimmed) || hasControlCharacter(trimmed)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Menu URL contains invalid characters',
      path: ['url'],
    });
  }
}

const menuUrlSchema = z
  .string()
  .min(1)
  .max(500)
  .superRefine((url, ctx) => assertSafeMenuUrl(url, ctx));

const baseMenuItemSchema = z.object({
    id: z.string().optional(),
    label: z.string().min(1).max(200),
    url: menuUrlSchema,
    type: menuItemTypeSchema,
    resourceId: z.string().optional(),
    resourceHandle: z.string().optional(),
    metaType: z.string().optional(),
  });

export const menuItemSchema: z.ZodType<MenuItemInput> = z.lazy(() =>
  baseMenuItemSchema.extend({
    items: z.array(menuItemSchema).default([]),
  }),
);

function collectDepthErrors(
  items: MenuItemInput[],
  depth: number,
  path: string,
  ctx: z.RefinementCtx,
): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const itemPath = `${path}[${i}]`;
    if (depth > MAX_MENU_DEPTH) {
      ctx.addIssue({
        code: 'custom',
        message: `Menu items cannot exceed ${MAX_MENU_DEPTH} levels of nesting`,
        path: itemPath.split(/[[\].]/).filter(Boolean),
      });
    }
    if (item.items?.length) {
      collectDepthErrors(item.items, depth + 1, `${itemPath}.items`, ctx);
    }
  }
}

export const menuItemsSchema = z.array(menuItemSchema).superRefine((items, ctx) => {
  collectDepthErrors(items, 1, 'items', ctx);
});

const handleSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Handle must be lowercase kebab-case');

export const createMenuSchema = z.object({
  title: z.string().min(1).max(200),
  handle: handleSchema.optional(),
  items: menuItemsSchema.default([]),
});

export const updateMenuSchema = createMenuSchema.partial();

export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;

export function titleToHandle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
