import { stripUiState, type MenuFormData, type MenuRecord } from './menu-types';

export function buildMenuPayload(form: MenuFormData) {
  return {
    title: form.title.trim(),
    handle: form.handle.trim() || undefined,
    items: stripUiState(form.items),
  };
}

export async function saveMenu(
  id: string | null,
  form: MenuFormData,
): Promise<MenuRecord> {
  const payload = buildMenuPayload(form);

  if (!id) {
    const res = await fetch('/api/v1/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to create menu');
    return data as MenuRecord;
  }

  const res = await fetch(`/api/v1/menus/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to update menu');
  return data as MenuRecord;
}

export async function deleteMenu(id: string): Promise<void> {
  const res = await fetch(`/api/v1/menus/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to delete menu');
}
