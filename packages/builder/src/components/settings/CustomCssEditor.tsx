'use client';

import { useEffect, useMemo, useState } from 'react';
import { validateCss, type CssValidationError } from '../../lib/validate-css';
import { LineNumberTextarea } from './LineNumberTextarea';

interface CustomCssEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function CustomCssEditor({ value, onChange, placeholder, rows = 8 }: CustomCssEditorProps) {
  const [errors, setErrors] = useState<CssValidationError[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setErrors(validateCss(value));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [value]);

  const errorLines = useMemo(() => new Set(errors.map((e) => e.line)), [errors]);
  const hasErrors = errors.length > 0;

  return (
    <div>
      <LineNumberTextarea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        errorLines={errorLines}
        invalid={hasErrors}
      />
      {hasErrors ? (
        <ul className="mt-2 space-y-1">
          {errors.map((error, index) => (
            <li key={`${error.line}-${index}`} className="text-xs text-red-600">
              Line {error.line}
              {error.column ? `:${error.column}` : ''} — {error.message}
            </li>
          ))}
        </ul>
      ) : value.trim() ? (
        <p className="mt-2 text-xs text-emerald-600">Valid CSS</p>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">CSS scoped to this section instance only.</p>
      )}
    </div>
  );
}
