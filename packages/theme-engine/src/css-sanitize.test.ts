import { describe, expect, it } from 'vitest';
import { sanitizeCustomCss } from '@zodyk/liquid';

describe('sanitizeCustomCss', () => {
  it('removes a style close tag that a single pass can reconstruct', () => {
    const out = sanitizeCustomCss('</sty</stylele><script>alert(1)</script>');
    expect(out.toLowerCase()).not.toContain('</style');
  });

  it('keeps legitimate CSS selectors intact', () => {
    expect(sanitizeCustomCss('a > b { color: red; }')).toBe('a > b { color: red; }');
  });

  it('strips expression(), javascript:, @import and behavior:', () => {
    const out = sanitizeCustomCss(
      'div { width: expression(alert(1)); background: url(javascript:alert(1)); } @import url(x); p { behavior: url(x); }',
    );
    expect(out).not.toContain('expression');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('@import');
    expect(out).not.toContain('behavior:');
  });

  it('does not loop forever on repeated dangerous input', () => {
    const out = sanitizeCustomCss('</style</style</style</style');
    expect(out.toLowerCase()).not.toContain('</style');
  });
});
