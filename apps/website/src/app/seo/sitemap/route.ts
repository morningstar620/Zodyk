import { sitemapResponse } from '@/lib/seo-routes';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return await sitemapResponse();
  } catch (error) {
    console.error('[website] sitemap failed:', error);
    return new NextResponse('Sitemap unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}
