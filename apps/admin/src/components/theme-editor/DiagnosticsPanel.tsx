'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DiagnosticEntry } from './hooks/useMonacoLsp';
import { modelUriToPath } from './languages/registerZodykLiquid';

interface DiagnosticsPanelProps {
  diagnostics: DiagnosticEntry[];
  onSelect: (uri: string, line: number, column: number) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export const DiagnosticsPanel = memo(function DiagnosticsPanel({
  diagnostics,
  onSelect,
  collapsed = false,
  onToggle,
}: DiagnosticsPanelProps) {
  const errors = useMemo(
    () => diagnostics.filter((d) => d.severity === 'error'),
    [diagnostics],
  );
  const warnings = useMemo(
    () => diagnostics.filter((d) => d.severity === 'warning'),
    [diagnostics],
  );

  if (collapsed) {
    return (
      <button
        type="button"
        className="shrink-0 border-t border-zinc-200 bg-white px-3 py-1 text-left text-xs text-zinc-600 hover:bg-zinc-50"
        onClick={onToggle}
      >
        Problems: {errors.length} error{errors.length !== 1 ? 's' : ''}, {warnings.length} warning
        {warnings.length !== 1 ? 's' : ''}
      </button>
    );
  }

  return (
    <div className="flex h-40 shrink-0 flex-col border-t border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-1">
        <span className="text-xs font-medium text-zinc-700">
          Problems ({errors.length + warnings.length})
        </span>
        {onToggle && (
          <button type="button" className="text-xs text-zinc-500 hover:text-zinc-800" onClick={onToggle}>
            Collapse
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {diagnostics.length === 0 ? (
          <p className="px-3 py-2 text-xs text-zinc-500">No problems detected</p>
        ) : (
          <ul>
            {diagnostics.map((diag, index) => {
              const path = modelUriToPath(diag.uri) ?? diag.uri;
              const fileName = path.split('/').pop() ?? path;
              return (
                <li key={`${diag.uri}-${diag.line}-${index}`}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-3 py-1.5 text-left text-xs hover:bg-zinc-50"
                    onClick={() => onSelect(diag.uri, diag.line, diag.column)}
                  >
                    <span
                      className={
                        diag.severity === 'error'
                          ? 'text-red-600'
                          : diag.severity === 'warning'
                            ? 'text-amber-600'
                            : 'text-blue-600'
                      }
                    >
                      {diag.severity === 'error' ? '✕' : diag.severity === 'warning' ? '⚠' : 'ℹ'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-zinc-800">{diag.message}</span>
                    <span className="shrink-0 text-zinc-400">
                      {fileName}:{diag.line}:{diag.column}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
});
