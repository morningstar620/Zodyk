const DANGEROUS_PATTERNS = [
  /<\/style/gi,
  /expression\s*\(/gi,
  /javascript:/gi,
  /@import/gi,
  /behavior\s*:/gi,
];

export function sanitizeCustomCss(css: string): string {
  let sanitized = css;
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  return sanitized.trim();
}

export function scopeCustomCss(css: string, wrapperId: string): string {
  const sanitized = sanitizeCustomCss(css);
  if (!sanitized) return '';

  const selector = `#${wrapperId}`;
  if (sanitized.includes(selector)) {
    return sanitized;
  }

  return sanitized
    .split('}')
    .map((rule) => {
      const trimmed = rule.trim();
      if (!trimmed) return '';
      const parts = trimmed.split('{');
      if (parts.length < 2) {
        return `${selector} { ${trimmed} }`;
      }
      const selectors = parts[0]!
        .split(',')
        .map((s) => `${selector} ${s.trim()}`)
        .join(', ');
      return `${selectors} { ${parts.slice(1).join('{')}`;
    })
    .filter(Boolean)
    .join('}\n');
}

export function sectionWrapperId(sectionId: string): string {
  return `section-${sectionId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

export function blockWrapperId(sectionId: string, blockId: string): string {
  return `section-${sectionId.replace(/[^a-zA-Z0-9_-]/g, '-')}-block-${blockId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}
