export const PROTECTED_THEME_PATHS = new Set([
  'layout/theme.liquid',
  'config/settings_schema.json',
]);

/**
 * Extensions decoded as UTF-8. Every other theme file is treated as binary so
 * that images, fonts, and other assets survive import and export unchanged.
 */
const TEXT_THEME_EXTENSIONS = [
  '.liquid',
  '.json',
  '.css',
  '.js',
  '.svg',
  '.txt',
  '.html',
  '.xml',
];

const CONTENT_TYPES: Record<string, string> = {
  '.liquid': 'text/x-liquid',
  '.json': 'application/json',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

export function isTextThemeFile(path: string): boolean {
  const lower = path.toLowerCase();
  return TEXT_THEME_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function guessContentType(path: string): string {
  const lower = path.toLowerCase();
  for (const [extension, contentType] of Object.entries(CONTENT_TYPES)) {
    if (lower.endsWith(extension)) return contentType;
  }
  return 'application/octet-stream';
}
