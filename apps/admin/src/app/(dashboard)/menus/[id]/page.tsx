'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MenuEditorForm } from '@/components/menus/menu-editor-form';
import { deleteMenu, saveMenu } from '@/components/menus/menu-api';
import type { MenuRecord } from '@/components/menus/menu-types';
import { TableSkeleton } from '@/components/skeletons';

export default function EditMenuPage() {
  const params = useParams();
  const router = useRouter();
  const menuId = typeof params.id === 'string' ? params.id : '';
  const [menu, setMenu] = useState<MenuRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!menuId) return;
    fetch(`/api/v1/menus/${menuId}`)
      .then((r) => r.json())
      .then((data) => {
        setMenu(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [menuId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <TableSkeleton rows={3} columns={1} />
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-muted-foreground">Menu not found.</p>
      </div>
    );
  }

  return (
    <MenuEditorForm
      mode="edit"
      initialMenu={menu}
      onSave={async (form) => {
        const result = await saveMenu(menuId, form);
        setMenu(result);
        return result;
      }}
      onDelete={async () => {
        await deleteMenu(menuId);
        router.push('/menus');
      }}
    />
  );
}
