'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageEditorForm } from '@/components/pages/page-editor-form';
import { savePage } from '@/components/pages/page-api';
import type { PageRecord } from '@/components/pages/page-types';
import { TableSkeleton } from '@/components/skeletons';

export default function EditPagePage() {
  const router = useRouter();
  const params = useParams();
  const pageId = params.id as string;
  const [page, setPage] = useState<PageRecord | null>(null);
  const [templates, setTemplates] = useState<string[]>([]);
  const [pageIds, setPageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pageId) return;

    Promise.all([
      fetch(`/api/v1/pages/${pageId}`).then((r) => r.json()),
      fetch('/api/v1/themes/templates').then((r) => r.json()),
      fetch('/api/v1/pages?limit=100').then((r) => r.json()),
    ])
      .then(([pageData, templateData, listData]) => {
        setPage(pageData);
        setTemplates(templateData.pageTemplates ?? []);
        setPageIds((listData.data ?? []).map((p: { id: string }) => p.id));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pageId]);

  if (loading || !page) {
    return (
      <div className="mx-auto max-w-6xl">
        <TableSkeleton rows={4} columns={1} />
      </div>
    );
  }

  return (
    <PageEditorForm
      mode="edit"
      initialPage={page}
      templates={templates}
      pageIds={pageIds}
      onSave={async (form) => {
        const result = await savePage(pageId, form);
        const updated = result as PageRecord;
        setPage(updated);
        return updated;
      }}
      onDelete={async () => {
        const res = await fetch(`/api/v1/pages/${pageId}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Failed to delete page');
        }
        router.push('/pages');
      }}
      onDuplicate={async () => {
        const res = await fetch('/api/v1/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${page.title} (copy)`,
            slug: `${page.slug}-copy-${Date.now().toString(36)}`,
            templateSuffix: page.templateSuffix,
            body: page.body,
            seo: page.seo,
            status: 'draft',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to duplicate page');
        router.push(`/pages/${data.id}`);
      }}
    />
  );
}
