import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import { normalizeRedirectPath, resolveRedirect, type RedirectStatusCode } from '@zodyk/seo';
import { NextResponse } from 'next/server';

function toAbsolute(location: string, requestUrl: string): string {
  const request = new URL(requestUrl);
  const absolute = /^https?:\/\//i.test(location)
    ? location
    : new URL(location, request.origin).toString();
  const destination = new URL(absolute);
  if (request.search && !destination.search) {
    destination.search = request.search;
  }
  return destination.toString();
}

/** Resolve an admin redirect before the theme renders. Returns null when no rule matches. */
export async function lookupStorefrontRedirect(
  pathname: string,
  requestUrl: string,
): Promise<NextResponse | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  await connectDatabase(uri);
  const fromPath = normalizeRedirectPath(pathname);
  const { Redirect } = getModels();
  const rule = await Redirect.findOne({
    tenantId: DEFAULT_TENANT_ID,
    fromPath,
    enabled: true,
  }).lean();
  if (!rule) return null;

  const statusCode: RedirectStatusCode = rule.statusCode === 302 ? 302 : 301;
  const match = resolveRedirect(pathname, [
    {
      fromPath: rule.fromPath,
      toPath: rule.toPath,
      statusCode,
      enabled: rule.enabled,
    },
  ]);
  if (!match) return null;

  return NextResponse.redirect(toAbsolute(match.location, requestUrl), match.statusCode);
}
