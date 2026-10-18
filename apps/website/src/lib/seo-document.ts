import { mergeLocalizedData } from '@zodyk/core';
import {
  composeMetaHead,
  composePageHead,
  composeSimpleHead,
  readSeoFields,
  textField,
  type ComposedHead,
  type PageCrumbSource,
} from '@zodyk/seo';
import type { ResolvedRoute, RoutePage } from '@zodyk/theme-engine';

function parentIdOf(page: RoutePage): string | undefined {
  if (!page.parentId) return undefined;
  const value = typeof page.parentId === 'string' ? page.parentId : page.parentId.toString();
  return value && value !== '[object Object]' ? value : undefined;
}

function toCrumb(page: RoutePage): PageCrumbSource {
  return {
    id: page._id.toString(),
    title: page.title,
    slug: page.slug,
    parentId: parentIdOf(page),
  };
}

export async function composeRouteHead(options: {
  route: ResolvedRoute;
  pages: RoutePage[];
  siteUrl: string;
  siteName: string;
  resolveImage: (ref: string | undefined) => Promise<string | undefined>;
}): Promise<ComposedHead> {
  const { route, siteUrl, siteName } = options;

  if (route.view === 'page' && route.page) {
    const fields = readSeoFields(route.page.seo);
    const imageUrl = await options.resolveImage(fields.ogImage);
    return composePageHead({
      siteUrl,
      siteName,
      page: { ...toCrumb(route.page), seo: route.page.seo },
      pages: options.pages.map(toCrumb),
      imageUrl,
    });
  }

  if (route.view === 'meta_single' && route.metaEntry && route.metaDefinition) {
    const merged = mergeLocalizedData(
      route.metaEntry.locale || 'en',
      route.metaEntry.data,
      route.metaEntry.translations,
      'en',
    );
    const fields = readSeoFields(merged);
    const imageUrl = await options.resolveImage(fields.ogImage);
    const title = textField(merged.title) || textField(merged.name) || route.metaEntry.handle;
    const routing = route.metaDefinition.routing;
    return composeMetaHead({
      siteUrl,
      siteName,
      title,
      handle: route.metaEntry.handle,
      definitionName: route.metaDefinition.name,
      definitionSlug: route.metaDefinition.slug,
      singlePath: routing?.singlePath,
      archiveEnabled: routing?.archiveEnabled !== false,
      archivePath: routing?.archivePath,
      seo: merged,
      imageUrl,
    });
  }

  if (route.view === 'meta_archive' && route.metaDefinition) {
    const archivePath = route.metaDefinition.routing?.archivePath || route.metaDefinition.slug;
    return composeSimpleHead({
      siteUrl,
      siteName,
      title: route.metaDefinition.name,
      path: archivePath,
    });
  }

  if (route.view === 'home') {
    return composeSimpleHead({
      siteUrl,
      siteName,
      title: siteName,
      path: '/',
    });
  }

  return { header: '' };
}
