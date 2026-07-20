export const PROTECTED_THEME_PATHS = new Set([
  'layout/theme.liquid',
  'config/settings_schema.json',
]);

export function guessContentType(path: string): string {
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.js')) return 'application/javascript';
  if (path.endsWith('.liquid')) return 'text/x-liquid';
  return 'text/plain';
}
