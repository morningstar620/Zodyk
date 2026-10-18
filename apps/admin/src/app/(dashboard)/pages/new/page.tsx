'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageEditorForm } from '@/components/pages/page-editor-form';
import { savePage } from '@/components/pages/page-api';
import type { PageOption, PageRecord } from '@/components/pages/page-types';

export default function NewPagePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<string[]>([]);
  const [pageOptions, setPageOptions] = useState<PageOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/themes/templates').then((r) => r.json()),
      fetch('/api/v1/pages/options').then((r) => r.json()),
    ])
      .then(([templateData, listData]) => {
        setTemplates(templateData.pageTemplates ?? []);
        setPageOptions(listData.data ?? []);
      })
      .catch(() => {});
  }, []);

  return (
    <PageEditorForm
      mode="create"
      templates={templates}
      pageOptions={pageOptions}
      onSave={async (form) => {
        const result = await savePage(null, form);
        const created = result as PageRecord;
        router.push(`/pages/${created.id}`);
        return created;
      }}
    />
  );
}
