import postcss, { type CssSyntaxError } from 'postcss';

export interface CssValidationError {
  line: number;
  column?: number;
  message: string;
}

export function validateCss(css: string): CssValidationError[] {
  const trimmed = css.trim();
  if (!trimmed) return [];

  try {
    postcss.parse(css);
    return [];
  } catch (error) {
    if (isCssSyntaxError(error)) {
      return [
        {
          line: error.line ?? 1,
          column: error.column,
          message: error.reason,
        },
      ];
    }
    return [{ line: 1, message: 'Invalid CSS syntax' }];
  }
}

function isCssSyntaxError(error: unknown): error is CssSyntaxError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as CssSyntaxError).name === 'CssSyntaxError'
  );
}
