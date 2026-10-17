/**
 * Ask the public website to drop its in-memory page cache.
 * Production requires REVALIDATE_SECRET on both this process and the website.
 */
export interface WebsiteCacheEnv {
  websiteUrl?: string;
  revalidateSecret?: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function revalidateRequestInit(secret: string | undefined): RequestInit {
  const trimmed = secret?.trim();
  const headers: Record<string, string> = {};
  if (trimmed) headers.Authorization = `Bearer ${trimmed}`;
  return { method: 'POST', headers };
}

export async function invalidateWebsiteCache(
  env: WebsiteCacheEnv = {},
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const websiteUrl = (
    env.websiteUrl ??
    process.env.WEBSITE_URL ??
    'http://localhost:3001'
  ).replace(/\/$/, '');
  const secret = env.revalidateSecret ?? process.env.REVALIDATE_SECRET;
  try {
    const response = await fetchImpl(
      `${websiteUrl}/api/revalidate`,
      revalidateRequestInit(secret),
    );
    if (!response.ok) {
      console.warn(`[cache] website revalidate failed: ${response.status}`);
    }
  } catch {
    /* website may be offline during admin save */
  }
}
