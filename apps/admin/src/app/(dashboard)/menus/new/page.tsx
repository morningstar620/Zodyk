'use client';

import { useRouter } from 'next/navigation';
import { MenuEditorForm } from '@/components/menus/menu-editor-form';
import { saveMenu } from '@/components/menus/menu-api';
import type { MenuRecord } from '@/components/menus/menu-types';

export default function NewMenuPage() {
  const router = useRouter();

  return (
    <MenuEditorForm
      mode="create"
      onSave={async (form) => {
        const result = await saveMenu(null, form);
        const created = result as MenuRecord;
        router.push(`/menus/${created.id}`);
        return created;
      }}
    />
  );
}
