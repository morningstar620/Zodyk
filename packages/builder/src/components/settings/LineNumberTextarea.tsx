'use client';

import { useCallback, useMemo, useRef } from 'react';
import { cn } from '@zodyk/shared-ui';

interface LineNumberTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  errorLines?: Set<number>;
  invalid?: boolean;
}

export function LineNumberTextarea({
  value,
  onChange,
  placeholder,
  rows = 8,
  errorLines,
  invalid = false,
}: LineNumberTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lineCount = useMemo(() => {
    const lines = value.split('\n').length;
    return Math.max(lines, rows);
  }, [value, rows]);

  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1),
    [lineCount],
  );

  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const gutter = gutterRef.current;
    if (textarea && gutter) {
      gutter.scrollTop = textarea.scrollTop;
    }
  }, []);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border bg-zinc-50',
        invalid ? 'border-red-300' : 'border-zinc-200',
      )}
      style={{ display: 'flex' }}
    >
      <div
        ref={gutterRef}
        aria-hidden
        className={cn(
          'shrink-0 select-none overflow-hidden border-r py-2 text-right font-mono text-xs leading-5',
          invalid ? 'border-red-200 bg-red-50 text-red-400' : 'border-zinc-200 bg-zinc-100 text-zinc-400',
        )}
        style={{ width: 36, paddingLeft: 8, paddingRight: 8 }}
      >
        {lineNumbers.map((n) => (
          <div
            key={n}
            className={cn(errorLines?.has(n) && 'font-semibold text-red-600')}
          >
            {n}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        rows={rows}
        className="min-h-0 min-w-0 flex-1 resize-none border-0 bg-transparent px-3 py-2 font-mono text-xs leading-5 text-zinc-800 outline-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        aria-invalid={invalid}
      />
    </div>
  );
}
