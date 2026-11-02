'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from '@zodyk/shared-ui';

export type EntryEditorStatus = 'draft' | 'published' | 'scheduled' | 'archived';

type EntrySidebarProps = {
  status: string;
  scheduledAt?: string;
  handle?: string;
  updatedAt?: string;
  createdAt?: string;
  busy?: boolean;
  onScheduledAtChange?: (scheduledAt: string | null) => void;
  onApplyStatus?: (status: EntryEditorStatus) => void;
  onDelete?: () => void;
};

function toDatetimeLocalValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function statusVariant(status: string): 'success' | 'secondary' | 'purple' | 'outline' {
  if (status === 'published') return 'success';
  if (status === 'draft') return 'secondary';
  if (status === 'scheduled') return 'purple';
  return 'outline';
}

export function EntrySidebar({
  status,
  scheduledAt,
  handle,
  updatedAt,
  createdAt,
  busy,
  onScheduledAtChange,
  onApplyStatus,
  onDelete,
}: EntrySidebarProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current status</span>
            <Badge variant={statusVariant(status)}>{status}</Badge>
          </div>
          <div>
            <Label htmlFor="entry-status">Change status</Label>
            <Select
              id="entry-status"
              value={
                status === 'scheduled' || status === 'published' || status === 'archived'
                  ? status
                  : 'draft'
              }
              onChange={(event) => onApplyStatus?.(event.target.value as EntryEditorStatus)}
              disabled={busy}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="entry-schedule">Schedule</Label>
            <Input
              id="entry-schedule"
              type="datetime-local"
              value={toDatetimeLocalValue(scheduledAt)}
              onChange={(event) =>
                onScheduledAtChange?.(fromDatetimeLocalValue(event.target.value))
              }
              disabled={busy}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              A future time publishes the entry on that date. Publish uses it when it is still
              ahead.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onApplyStatus?.('scheduled')}
            >
              Schedule
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onApplyStatus?.('archived')}
            >
              Archive
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onDelete}>
              Delete
            </Button>
          </div>
          {handle && (
            <div>
              <p className="text-xs text-muted-foreground">Handle</p>
              <p className="font-mono text-sm text-foreground">/{handle}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {createdAt && (
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="text-foreground">{new Date(createdAt).toLocaleString()}</p>
            </div>
          )}
          {updatedAt && (
            <div>
              <p className="text-muted-foreground">Last updated</p>
              <p className="text-foreground">{new Date(updatedAt).toLocaleString()}</p>
            </div>
          )}
          {scheduledAt && (
            <div>
              <p className="text-muted-foreground">Scheduled</p>
              <p className="text-foreground">{new Date(scheduledAt).toLocaleString()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
