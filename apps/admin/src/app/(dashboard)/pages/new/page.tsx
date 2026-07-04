'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageEditorForm } from '@/components/pages/page-editor-form';
import { savePage } from '@/components/pages/page-api';
import type { PageRecord } from '@/components/pages/page-types';

export default function NewPagePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/v1/themes/templates')
      .then((r) => r.json())
      .then((data) => setTemplates(data.pageTemplates ?? []))
      .catch(() => {});
  }, []);

  return (
    <PageEditorForm
      mode="create"
      templates={templates}
      onSave={async (form) => {
        const result = await savePage(null, form);
        const created = result as PageRecord;
        router.push(`/pages/${created.id}`);
        return created;
      }}
    />
  );
}
