import { authorizeRevalidate } from '@/lib/revalidate-auth';
import { invalidateSiteCache } from '@/lib/site-cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const decision = authorizeRevalidate({
    authorization: request.headers.get('authorization'),
    secret: process.env.REVALIDATE_SECRET,
    nodeEnv: process.env.NODE_ENV,
  });
  if (!decision.ok) {
    if (decision.status === 503) {
      console.warn('[website] REVALIDATE_SECRET is not set; refusing cache flush');
    }
    return NextResponse.json({ error: decision.error }, { status: decision.status });
  }
  invalidateSiteCache();
  return NextResponse.json({ revalidated: true });
}
