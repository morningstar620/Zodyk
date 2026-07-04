import { cn } from '@zodyk/shared-ui';

export const editorShellClass =
  'editor-shell flex h-full flex-col bg-background text-foreground';
export const editorAsideClass =
  'w-80 shrink-0 overflow-y-auto border-l border-border/50 bg-background p-3';
export const editorHeaderClass =
  'flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-background px-4';

export const editorPanelClass = 'overflow-hidden rounded-xl border border-border/50 bg-card';
export const editorPanelBodyClass = 'space-y-4 border-t border-border/50 px-4 py-4';
export const editorPanelToggleClass =
  'flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm font-medium text-card-foreground';

export const editorInputClass =
  'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none';

export const editorApplyButtonClass =
  'h-9 w-full cursor-pointer rounded-lg border border-border/50 bg-muted text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40';

export const editorGhostButtonClass =
  'h-8 cursor-pointer rounded-lg border border-border/50 bg-card px-3.5 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50';

export const editorIconButtonClass = (enabled: boolean) =>
  cn(
    'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors disabled:cursor-not-allowed',
    enabled ? 'hover:bg-muted hover:text-foreground' : 'cursor-not-allowed opacity-35',
  );

export const editorToggleButtonClass = (active: boolean) =>
  cn(
    'flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border text-sm transition-colors',
    active
      ? 'border-border bg-muted text-foreground'
      : 'border-border/50 text-muted-foreground hover:border-border hover:bg-muted/60',
  );

export const editorOptionButtonClass = (active: boolean) =>
  cn(
    'flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
    active
      ? 'border-border bg-muted text-foreground'
      : 'border-border/50 text-muted-foreground hover:border-border hover:bg-muted/40',
  );

export const editorListItemClass = (active: boolean) =>
  cn(
    'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
    active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60',
  );

export const editorPreviewClass =
  'editor-preview-canvas relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-background';
