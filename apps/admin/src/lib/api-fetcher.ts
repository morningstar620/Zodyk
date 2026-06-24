export async function apiFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function prefetchApi(url: string): void {
  void fetch(url, { priority: 'low' } as RequestInit).catch(() => undefined);
}
