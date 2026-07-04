'use client';

import { Alert, Button, Card, CardContent, Input, Label } from '@zodyk/shared-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MenuEditorHeader } from './menu-editor-header';
import { MenuItemsTree } from './menu-items-tree';
import {
  defaultMenuFormData,
  menuToFormData,
  titleToHandle,
  type MenuFormData,
  type MenuRecord,
} from './menu-types';

type MenuEditorFormProps = {
  mode: 'create' | 'edit';
  initialMenu?: MenuRecord;
  onSave: (data: MenuFormData) => Promise<MenuRecord | void>;
  onDelete?: () => Promise<void>;
};

export function MenuEditorForm({ mode, initialMenu, onSave, onDelete }: MenuEditorFormProps) {
  const [form, setForm] = useState<MenuFormData>(
    initialMenu ? menuToFormData(initialMenu) : defaultMenuFormData(),
  );
  const [savedForm, setSavedForm] = useState<MenuFormData>(
    initialMenu ? menuToFormData(initialMenu) : defaultMenuFormData(),
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handleTouched, setHandleTouched] = useState(mode === 'edit');

  useEffect(() => {
    if (initialMenu) {
      const data = menuToFormData(initialMenu);
      setForm(data);
      setSavedForm(data);
      setHandleTouched(true);
    }
  }, [initialMenu]);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm]);

  const updateForm = useCallback((patch: Partial<MenuFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const displayHandle = form.handle || titleToHandle(form.title) || '—';

  function handleTitleChange(title: string) {
    const patch: Partial<MenuFormData> = { title };
    if (!handleTouched) {
      patch.handle = titleToHandle(title);
    }
    updateForm(patch);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const cleanForm = {
        ...form,
        handle: form.handle || titleToHandle(form.title),
      };
      setForm(cleanForm);
      const result = await onSave(cleanForm);
      if (result) {
        const saved = menuToFormData(result);
        setForm(saved);
        setSavedForm(saved);
      } else {
        setSavedForm(cleanForm);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm('Delete this menu? This cannot be undone.')) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-24">
      <MenuEditorHeader
        mode={mode}
        title={form.title}
        menuId={initialMenu?.id}
        onDelete={mode === 'edit' ? handleDelete : undefined}
        deleting={deleting}
      />

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label htmlFor="menu-title">Name</Label>
            <Input
              id="menu-title"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g., Sidebar menu"
              className="mt-1.5"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">Handle: {displayHandle}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-sm font-semibold text-foreground">Menu items</h2>
          <MenuItemsTree items={form.items} onChange={(items) => updateForm({ items })} />
        </CardContent>
      </Card>

      <div className="fixed bottom-6 right-6 z-40">
        <Button
          type="button"
          size="lg"
          disabled={!isDirty || saving || !form.title.trim()}
          onClick={handleSave}
          className="min-w-[7rem] shadow-lg"
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
