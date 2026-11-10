export function normalizeSearchQuery(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function searchHref(query: string | null | undefined): string {
  const normalized = normalizeSearchQuery(query);
  return normalized ? `/search?q=${encodeURIComponent(normalized)}` : '/search';
}
