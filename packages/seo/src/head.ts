import { isNoIndex, readSeoFields, textField, type SeoFields } from './fields';
import { escapeHtml, isHttpUrl, jsonLdScript } from './html';
import {
  buildBreadcrumbJsonLd,
  buildPageBreadcrumbs,
  buildWebPageJsonLd,
  type PageCrumbSource,
} from './jsonld';
import {
  absoluteUrl,
  joinPublicPath,
  metaEntryPublicPath,
  pagePublicPath,
  sanitizeSiteUrl,
} from './paths';

export interface SeoHeadInput {
  /** Document and social title before social overrides. */
  title?: string;
  description?: string;
  /** Absolute URL of this resource. */
  pageUrl: string;
  /** Public site origin used to absolutize relative breadcrumb paths. */
  siteUrl?: string;
  canonicalUrl?: string;
  imageUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
  robots?: string;
  siteName?: string;
  /** Open Graph type. Defaults to `website`. */
  ogType?: string;
  breadcrumbs?: Array<{ name: string; path: string }>;
  schemaOrg?: unknown;
}

const TWITTER_CARDS = new Set(['summary', 'summary_large_image']);

function robotsContent(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!/^[a-zA-Z0-9_,\s:-]+$/.test(value)) return undefined;
  if (isNoIndex(value)) return 'noindex, nofollow';
  if (value.toLowerCase() === 'index') return 'index, follow';
  return value;
}

function metaTag(
  attr: 'name' | 'property',
  key: string,
  content: string | undefined,
): string | undefined {
  if (!content) return undefined;
  return `<meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(content)}">`;
}

function resolveCanonical(pageUrl: string, canonicalUrl: string | undefined): string | undefined {
  if (canonicalUrl && isHttpUrl(canonicalUrl)) return canonicalUrl;
  if (isHttpUrl(pageUrl)) return pageUrl;
  return undefined;
}

export function buildContentForHeader(input: SeoHeadInput): string {
  const title = input.title?.trim() || undefined;
  const description = input.description?.trim() || undefined;
  const canonical = resolveCanonical(input.pageUrl, input.canonicalUrl);
  const image = input.imageUrl && isHttpUrl(input.imageUrl) ? input.imageUrl : undefined;
  const ogTitle = input.ogTitle?.trim() || title;
  const ogDescription = input.ogDescription?.trim() || description;
  const twitterCard = TWITTER_CARDS.has(input.twitterCard ?? '')
    ? input.twitterCard
    : image
      ? 'summary_large_image'
      : 'summary';

  const tags: string[] = [];
  const descriptionTag = metaTag('name', 'description', description);
  if (descriptionTag) tags.push(descriptionTag);

  const robots = robotsContent(input.robots);
  const robotsTag = metaTag('name', 'robots', robots);
  if (robotsTag) tags.push(robotsTag);

  if (canonical) tags.push(`<link rel="canonical" href="${escapeHtml(canonical)}">`);

  const ogTags = [
    metaTag('property', 'og:title', ogTitle),
    metaTag('property', 'og:description', ogDescription),
    metaTag('property', 'og:url', canonical),
    metaTag('property', 'og:type', input.ogType?.trim() || 'website'),
    metaTag('property', 'og:site_name', input.siteName?.trim()),
    metaTag('property', 'og:image', image),
  ].filter((tag): tag is string => Boolean(tag));
  tags.push(...ogTags);

  const twitterTags = [
    metaTag('name', 'twitter:card', ogTitle || description || image ? twitterCard : undefined),
    metaTag('name', 'twitter:title', ogTitle),
    metaTag('name', 'twitter:description', ogDescription),
    metaTag('name', 'twitter:image', image),
  ].filter((tag): tag is string => Boolean(tag));
  tags.push(...twitterTags);

  const crumbBase = input.siteUrl
    ? sanitizeSiteUrl(input.siteUrl)
    : canonical
      ? new URL(canonical).origin
      : undefined;
  const crumbs =
    crumbBase && input.breadcrumbs
      ? input.breadcrumbs.map((crumb) => ({
          name: crumb.name,
          url: isHttpUrl(crumb.path) ? crumb.path : absoluteUrl(crumbBase, crumb.path),
        }))
      : [];

  const graph: Record<string, unknown>[] = [];
  if (canonical) {
    graph.push(
      buildWebPageJsonLd({
        title: ogTitle,
        description: ogDescription,
        url: canonical,
        imageUrl: image,
      }),
    );
  }
  const breadcrumb = buildBreadcrumbJsonLd(crumbs);
  if (breadcrumb) graph.push(breadcrumb);
  if (graph.length > 0) {
    tags.push(jsonLdScript({ '@context': 'https://schema.org', '@graph': graph }));
  }

  if (input.schemaOrg && typeof input.schemaOrg === 'object') {
    tags.push(jsonLdScript(input.schemaOrg));
  }

  return tags.join('\n');
}

/** Replace or insert the document `<title>` with an HTML-escaped value. */
export function applyDocumentTitle(html: string, title: string | undefined): string {
  const trimmed = title?.trim();
  if (!trimmed) return html;
  const safe = `<title>${escapeHtml(trimmed)}</title>`;
  if (/<title[\s>][\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title[\s>][\s\S]*?<\/title>/i, safe);
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (open) => `${open}${safe}`);
  }
  return html;
}

export function resolveDocumentTitle(options: {
  metaTitle?: string;
  fallbackTitle?: string;
  siteName?: string;
}): string | undefined {
  return (
    options.metaTitle?.trim() ||
    options.fallbackTitle?.trim() ||
    options.siteName?.trim() ||
    undefined
  );
}

export interface ComposedHead {
  header: string;
  documentTitle?: string;
  imageRef?: string;
}

function headFromFields(options: {
  fields: SeoFields;
  fallbackTitle?: string;
  pageUrl: string;
  siteUrl: string;
  siteName: string;
  imageUrl?: string;
  ogType?: string;
  breadcrumbs?: Array<{ name: string; path: string }>;
}): ComposedHead {
  const title = resolveDocumentTitle({
    metaTitle: options.fields.metaTitle,
    fallbackTitle: options.fallbackTitle,
    siteName: options.siteName,
  });
  return {
    documentTitle: title,
    imageRef: options.fields.ogImage,
    header: buildContentForHeader({
      title,
      description: options.fields.metaDescription,
      pageUrl: options.pageUrl,
      siteUrl: options.siteUrl,
      canonicalUrl: options.fields.canonicalUrl,
      imageUrl: options.imageUrl,
      ogTitle: options.fields.ogTitle,
      ogDescription: options.fields.ogDescription,
      twitterCard: options.fields.twitterCard,
      robots: options.fields.robots,
      siteName: options.siteName,
      ogType: options.ogType,
      breadcrumbs: options.breadcrumbs,
      schemaOrg: options.fields.schemaOrg,
    }),
  };
}

export function composePageHead(options: {
  siteUrl: string;
  siteName: string;
  page: PageCrumbSource & { seo?: unknown };
  pages: PageCrumbSource[];
  imageUrl?: string;
}): ComposedHead {
  const fields = readSeoFields(options.page.seo);
  const pageUrl =
    fields.canonicalUrl && isHttpUrl(fields.canonicalUrl)
      ? fields.canonicalUrl
      : absoluteUrl(options.siteUrl, pagePublicPath(options.page.slug));
  const breadcrumbs = buildPageBreadcrumbs({
    page: options.page,
    pages: options.pages,
    siteName: options.siteName,
  });
  return headFromFields({
    fields,
    fallbackTitle: options.page.title,
    pageUrl,
    siteUrl: options.siteUrl,
    siteName: options.siteName,
    imageUrl: options.imageUrl,
    breadcrumbs,
  });
}

export function composeMetaHead(options: {
  siteUrl: string;
  siteName: string;
  title: string;
  handle: string;
  definitionName: string;
  definitionSlug: string;
  singlePath?: string;
  archiveEnabled?: boolean;
  archivePath?: string;
  seo?: unknown;
  imageUrl?: string;
}): ComposedHead {
  const fields = readSeoFields(options.seo);
  const entryPath = metaEntryPublicPath(options.singlePath, options.definitionSlug, options.handle);
  const pageUrl =
    fields.canonicalUrl && isHttpUrl(fields.canonicalUrl)
      ? fields.canonicalUrl
      : absoluteUrl(options.siteUrl, entryPath);
  const fallbackTitle = fields.metaTitle || options.title || options.handle;
  const breadcrumbs = options.archiveEnabled
    ? [
        { name: options.siteName || 'Home', path: '/' },
        {
          name: options.definitionName,
          path: joinPublicPath(options.archivePath || options.definitionSlug),
        },
        { name: fallbackTitle, path: entryPath },
      ]
    : undefined;

  return headFromFields({
    fields,
    fallbackTitle,
    pageUrl,
    siteUrl: options.siteUrl,
    siteName: options.siteName,
    imageUrl: options.imageUrl,
    ogType: 'article',
    breadcrumbs,
  });
}

export function composeSimpleHead(options: {
  siteUrl: string;
  siteName: string;
  title?: string;
  description?: string;
  path: string;
}): ComposedHead {
  const pageUrl = absoluteUrl(options.siteUrl, options.path);
  const title = options.title?.trim() || options.siteName;
  return {
    documentTitle: title,
    header: buildContentForHeader({
      title,
      description: textField(options.description),
      pageUrl,
      siteUrl: options.siteUrl,
      siteName: options.siteName,
    }),
  };
}
