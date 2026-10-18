export async function invalidateWebsiteCache(): Promise<void> {
  const websiteUrl = process.env.WEBSITE_URL ?? 'http://localhost:3001';
  try {
    await fetch(`${websiteUrl}/api/revalidate`, { method: 'POST' });
  } catch {
    /* website may be offline during admin save */
  }
}
