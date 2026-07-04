'use client';

import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@zodyk/shared-ui';
import type { PageSeo } from '@zodyk/core';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

type PageSeoCardProps = {
  title: string;
  slug: string;
  seo: PageSeo;
  siteName?: string;
  siteUrl?: string;
  onChange: (seo: PageSeo) => void;
};

function normalizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-');
}

export function PageSeoCard({
  title,
  slug,
  seo,
  siteName = 'zodyk',
  siteUrl = 'http://localhost:3001',
  onChange,
}: PageSeoCardProps) {
  const [editing, setEditing] = useState(false);

  const siteHost = siteUrl.replace(/\/$/, '');
  const displayTitle = seo.metaTitle || title || 'Page title';
  const displayDescription = seo.metaDescription;
  const pageSlug = slug || 'page';

  const canonicalPath =
    seo.canonicalUrl && seo.canonicalUrl.startsWith(`${siteHost}/`)
      ? seo.canonicalUrl.slice(siteHost.length + 1)
      : slug;

  const handleCanonicalChange = (value: string) => {
    const path = normalizeSlugInput(value.replace(/^\/+/, ''));
    onChange({ ...seo, canonicalUrl: path ? `${siteHost}/${path}` : undefined });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm font-medium">Search engine listing</CardTitle>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={editing ? 'Close SEO editor' : 'Edit SEO'}
        >
          <Pencil className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="meta-title">Page title</Label>
              <Input
                id="meta-title"
                value={seo.metaTitle ?? ''}
                onChange={(e) => onChange({ ...seo, metaTitle: e.target.value })}
                placeholder={title || 'Page title'}
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {(seo.metaTitle ?? title).length}/70 characters recommended
              </p>
            </div>
            <div>
              <Label htmlFor="meta-description">Meta description</Label>
              <textarea
                id="meta-description"
                value={seo.metaDescription ?? ''}
                onChange={(e) => onChange({ ...seo, metaDescription: e.target.value })}
                placeholder="Enter a description for search engines"
                rows={3}
                className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {(seo.metaDescription ?? '').length}/160 characters recommended
              </p>
            </div>
            <div>
              <Label htmlFor="canonical-url">Canonical URL</Label>
              <div className="mt-1.5 flex items-center rounded-md border border-input bg-transparent focus-within:ring-2 focus-within:ring-ring">
                <span className="shrink-0 border-r border-input px-3 py-2 text-sm text-muted-foreground">
                  {siteHost.replace(/^https?:\/\//, '')}/
                </span>
                <input
                  id="canonical-url"
                  value={canonicalPath}
                  onChange={(e) => handleCanonicalChange(e.target.value)}
                  placeholder={pageSlug}
                  className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>
        ) : title || seo.metaTitle ? (
          <div className="space-y-1">
            <p className="text-sm text-foreground">{siteName}</p>
            <p className="text-xs text-muted-foreground">
              {siteHost.replace(/^https?:\/\//, '')} &rsaquo; {pageSlug}
            </p>
            <p className="text-base text-primary">{displayTitle}</p>
            {displayDescription && (
              <p className="text-sm text-muted-foreground line-clamp-2">{displayDescription}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add a title and description to see how this page might appear in a search engine listing
          </p>
        )}
      </CardContent>
    </Card>
  );
}
