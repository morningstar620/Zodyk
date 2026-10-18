'use client';

import { Alert, Button, Card, CardContent, Input, Label, Select } from '@zodyk/shared-ui';
import { collectDescendantIds, pagePublicPath, resolvePagePublication } from '@zodyk/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RichTextEditor } from '@/components/content/RichTextEditor';
import { RevisionHistory } from '@/components/revisions/revision-history';
import { PageEditorHeader } from './page-editor-header';
import { PageSeoCard } from './page-seo-card';
import { PageTemplateCard } from './page-template-card';
import {
  defaultPageFormData,
  normalizeSlugInput,
  pageToFormData,
  slugFromTitle,
  type PageFormData,
  type PageOption,
  type PageRecord,
} from './page-types';
import { PageVisibilityCard } from './page-visibility-card';

const SITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'http://localhost:3001';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'zodyk';

type PageEditorFormProps = {
  mode: 'create' | 'edit';
  initialPage?: PageRecord;
  templates: string[];
  pageIds?: string[];
  pageOptions?: PageOption[];
  onSave: (data: PageFormData) => Promise<PageRecord | void>;
  onDelete?: () => Promise<void>;
  onDuplicate?: () => Promise<void>;
  onArchive?: () => Promise<void>;
  onRevisionRestored?: () => Promise<void>;
};

export function PageEditorForm({
  mode,
  initialPage,
  templates,
  pageIds = [],
  pageOptions = [],
  onSave,
  onDelete,
  onDuplicate,
  onArchive,
  onRevisionRestored,
}: PageEditorFormProps) {
  const [form, setForm] = useState<PageFormData>(
    initialPage ? pageToFormData(initialPage) : defaultPageFormData(),
  );
  const [savedForm, setSavedForm] = useState<PageFormData>(
    initialPage ? pageToFormData(initialPage) : defaultPageFormData(),
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');

  useEffect(() => {
    if (initialPage) {
      const data = pageToFormData(initialPage);
      setForm(data);
      setSavedForm(data);
      setSlugTouched(true);
    }
  }, [initialPage]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
  );

  const updateForm = useCallback((patch: Partial<PageFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleTitleChange = (title: string) => {
    const patch: Partial<PageFormData> = { title };
    if (!slugTouched) {
      patch.slug = slugFromTitle(title);
    }
    updateForm(patch);
  };

  const handleSlugChange = (slug: string) => {
    setSlugTouched(true);
    updateForm({ slug });
  };

  const currentIndex = initialPage ? pageIds.indexOf(initialPage.id) : -1;
  const prevPageId = currentIndex > 0 ? pageIds[currentIndex - 1] : undefined;
  const nextPageId =
    currentIndex >= 0 && currentIndex < pageIds.length - 1 ? pageIds[currentIndex + 1] : undefined;

  const blockedParentIds = useMemo(() => {
    if (!initialPage) return new Set<string>();
    return collectDescendantIds(pageOptions, initialPage.id);
  }, [initialPage, pageOptions]);

  const parentChoices = pageOptions.filter(
    (option) => option.id !== initialPage?.id && !blockedParentIds.has(option.id),
  );

  const savedPublication = resolvePagePublication({
    visible: savedForm.visible,
    publishedAt: savedForm.publishedAt,
    archived: !savedForm.visible && savedForm.status === 'archived',
  });
  const viewPath = pagePublicPath(
    {
      id: initialPage?.id ?? 'draft',
      slug: form.slug || 'page',
      parentId: form.parentId,
    },
    pageOptions,
  );
  const savedPath = pagePublicPath(
    {
      id: initialPage?.id ?? 'draft',
      slug: savedForm.slug || initialPage?.slug || '',
      parentId: savedForm.parentId,
    },
    pageOptions,
  );
  const viewUrl =
    initialPage && savedPublication.status === 'published' && savedPath !== '/'
      ? `${SITE_URL.replace(/\/$/, '')}${savedPath}`
      : undefined;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const cleanSlug = slugFromTitle(form.slug || form.title);
      const cleanForm = { ...form, slug: cleanSlug };
      setForm(cleanForm);
      const result = await onSave(cleanForm);
      if (result) {
        const saved = pageToFormData(result);
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
    if (!window.confirm('Delete this page? This cannot be undone.')) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  async function handleArchive() {
    if (!onArchive) return;
    const archived = form.status === 'archived';
    const message = archived
      ? 'Move this page back to drafts?'
      : 'Archive this page? It stays in the admin and is removed from the public site.';
    if (!window.confirm(message)) return;
    setArchiving(true);
    setError(null);
    try {
      await onArchive();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive');
    } finally {
      setArchiving(false);
    }
  }

  async function handleDuplicate() {
    if (!onDuplicate) return;
    setDuplicating(true);
    setError(null);
    try {
      await onDuplicate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate');
      setDuplicating(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-24">
      <PageEditorHeader
        mode={mode}
        title={form.title}
        pageId={initialPage?.id}
        prevPageId={prevPageId}
        nextPageId={nextPageId}
        viewUrl={viewUrl}
        onDuplicate={mode === 'edit' ? handleDuplicate : undefined}
        onDelete={mode === 'edit' ? handleDelete : undefined}
        onArchive={mode === 'edit' ? handleArchive : undefined}
        archived={form.status === 'archived'}
        duplicating={duplicating}
        deleting={deleting}
        archiving={archiving}
      />

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div>
                <Label htmlFor="page-title">Title</Label>
                <Input
                  id="page-title"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. About us, sizing chart, FAQ"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="page-content">Content</Label>
                <div className="mt-1.5">
                  <RichTextEditor
                    value={form.body}
                    onChange={(body) => updateForm({ body })}
                    placeholder="Start writing your page content…"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <PageSeoCard
            title={form.title}
            slug={form.slug}
            seo={form.seo}
            siteName={SITE_NAME}
            siteUrl={SITE_URL}
            onChange={(seo) => updateForm({ seo })}
          />
        </div>

        <div className="flex flex-col gap-6">
          <PageVisibilityCard
            visible={form.visible}
            publishedAt={form.publishedAt}
            onChange={(visible, publishedAt) => updateForm({ visible, publishedAt })}
          />

          <PageTemplateCard
            templateSuffix={form.templateSuffix}
            templates={templates}
            onChange={(templateSuffix) => updateForm({ templateSuffix })}
          />

          <Card>
            <CardContent className="pt-6">
              <Label htmlFor="page-parent">Parent page</Label>
              <Select
                id="page-parent"
                value={form.parentId ?? ''}
                onChange={(event) => updateForm({ parentId: event.target.value || null })}
                className="mt-1.5"
              >
                <option value="">No parent</option>
                {parentChoices.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title} ({option.path})
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                {form.slug ? `Public URL ${viewPath}` : 'The public URL includes each parent slug.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Label htmlFor="url-handle">URL handle</Label>
              <Input
                id="url-handle"
                value={form.slug}
                onChange={(e) => handleSlugChange(normalizeSlugInput(e.target.value))}
                placeholder="page-handle"
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {mode === 'edit' && initialPage && (
        <RevisionHistory
          listUrl={`/api/v1/pages/${initialPage.id}/revisions`}
          refreshKey={initialPage.updatedAt}
          onRestored={onRevisionRestored}
        />
      )}

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
