'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import { CalendarClock, Pencil } from 'lucide-react';
import { useState } from 'react';

type PageVisibilityCardProps = {
  visible: boolean;
  publishedAt?: string;
  onChange: (visible: boolean, publishedAt?: string) => void;
};

function formatPublishedAt(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function toDatetimeLocalValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function PageVisibilityCard({ visible, publishedAt, onChange }: PageVisibilityCardProps) {
  const [editingDate, setEditingDate] = useState(false);
  const formattedDate = formatPublishedAt(publishedAt);
  const scheduled = Boolean(publishedAt && new Date(publishedAt).getTime() > Date.now());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm font-medium">Visibility</CardTitle>
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="visibility"
            checked={visible}
            onChange={() => onChange(true, publishedAt ?? new Date().toISOString())}
            className="mt-1"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Visible</p>
            {visible && formattedDate && (
              <div className="mt-1 flex items-center gap-1.5">
                {editingDate ? (
                  <input
                    type="datetime-local"
                    value={toDatetimeLocalValue(publishedAt)}
                    onChange={(e) => onChange(true, fromDatetimeLocalValue(e.target.value))}
                    onBlur={() => setEditingDate(false)}
                    className="rounded border border-input px-2 py-1 text-xs"
                    autoFocus
                  />
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {scheduled ? 'Scheduled for' : 'As of'} {formattedDate}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingDate(true)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit publish date"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="visibility"
            checked={!visible}
            onChange={() => onChange(false)}
            className="mt-1"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Hidden</p>
          </div>
        </label>
      </CardContent>
    </Card>
  );
}
