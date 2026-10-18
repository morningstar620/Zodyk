import { robotsResponse } from '@/lib/seo-routes';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return await robotsResponse();
  } catch (error) {
    console.error('[website] robots.txt failed:', error);
    return new NextResponse('Robots.txt unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}
