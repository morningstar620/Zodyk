'use client';

interface EditorStatusBarProps {
  path: string | null;
  language: string;
  errorCount: number;
  warningCount: number;
  dirty: boolean;
  saving: boolean;
  lspReady: boolean;
  storageLabel?: string;
}

export function EditorStatusBar({
  path,
  language,
  errorCount,
  warningCount,
  dirty,
  saving,
  lspReady,
  storageLabel,
}: EditorStatusBarProps) {
  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-zinc-200 bg-zinc-100 px-3 text-[11px] text-zinc-600">
      <div className="flex items-center gap-3 truncate">
        <span>{path ?? 'No file selected'}</span>
        {dirty && <span className="text-amber-700">Modified</span>}
        {saving && <span>Saving…</span>}
      </div>
      <div className="flex items-center gap-3">
        {storageLabel && <span className="text-zinc-500">{storageLabel}</span>}
        <span>{language}</span>
        {errorCount > 0 && <span className="text-red-600">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>}
        {warningCount > 0 && (
          <span className="text-amber-600">{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>
        )}
        <span className={lspReady ? 'text-emerald-600' : 'text-zinc-400'}>
          {lspReady ? 'LSP ready' : 'LSP starting…'}
        </span>
      </div>
    </div>
  );
}
