import { existsSync } from 'node:fs';
import { isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';

export function resolveThemeLocalRoot(): string {
  const configured = process.env.THEME_LOCAL_ROOT;
  if (configured) {
    return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
  }

  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'themes');
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  return resolve(process.cwd(), 'themes');
}

export function themeRoot(
  theme: { slug: string; localRoot?: string },
  localRootBase = resolveThemeLocalRoot(),
): string {
  if (theme.localRoot) {
    return isAbsolute(theme.localRoot)
      ? theme.localRoot
      : join(localRootBase, theme.localRoot);
  }
  return join(localRootBase, theme.slug);
}

export function themePath(
  theme: { slug: string; localRoot?: string },
  relativePath?: string,
  localRootBase = resolveThemeLocalRoot(),
): string {
  const root = themeRoot(theme, localRootBase);
  if (!relativePath) return root;
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return join(root, ...normalized.split('/').filter(Boolean));
}

/** Ensure a resolved path stays under the theme root (no traversal). */
export function assertWithinThemeRoot(root: string, absolutePath: string): string {
  const normalizedRoot = normalize(root + sep);
  const normalizedPath = normalize(absolutePath);
  const rel = relative(root, normalizedPath);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Path escapes theme root: ${absolutePath}`);
  }
  if (!normalizedPath.startsWith(normalizedRoot) && normalizedPath !== normalize(root)) {
    throw new Error(`Path escapes theme root: ${absolutePath}`);
  }
  return normalizedPath;
}

export function toPosixRelative(fromRoot: string, absolutePath: string): string {
  return relative(fromRoot, absolutePath).replace(/\\/g, '/');
}
