import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DESIGN_PREVIEW_TTL_MS,
  resolveStorefrontAccess,
  signDesignPreviewToken,
  verifyDesignPreviewToken,
} from './design-preview';

const SECRET = 'auth-secret';
const NOW = 1_700_000_000_000;

function access(
  overrides: Partial<Parameters<typeof resolveStorefrontAccess>[0]> = {},
) {
  return resolveStorefrontAccess({
    previewParam: null,
    previewSignature: null,
    previewThemeId: null,
    previewToken: null,
    cookieTheme: null,
    cookieToken: null,
    adminSession: false,
    signingSecret: SECRET,
    nowMs: NOW,
    ...overrides,
  });
}

describe('design preview tokens', () => {
  it('accepts a token until it expires', () => {
    const token = signDesignPreviewToken(SECRET, NOW, DESIGN_PREVIEW_TTL_MS);
    assert.equal(verifyDesignPreviewToken(token, SECRET, NOW + DESIGN_PREVIEW_TTL_MS - 1), true);
    assert.equal(verifyDesignPreviewToken(token, SECRET, NOW + DESIGN_PREVIEW_TTL_MS), false);
  });

  it('rejects a tampered or unsigned token', () => {
    const token = signDesignPreviewToken(SECRET, NOW);
    assert.equal(verifyDesignPreviewToken(`${token}x`, SECRET, NOW), false);
    assert.equal(verifyDesignPreviewToken(token, 'other-secret', NOW), false);
    assert.equal(verifyDesignPreviewToken('1', SECRET, NOW), false);
    assert.equal(verifyDesignPreviewToken(token, undefined, NOW), false);
  });
});

describe('resolveStorefrontAccess', () => {
  it('does not enable design mode for an anonymous ?preview=1', () => {
    const result = access({ previewParam: '1' });
    assert.equal(result.designMode, false);
    assert.equal(result.isPreview, false);
  });

  it('enables design mode for a valid signed preview token', () => {
    const result = access({
      previewParam: '1',
      previewSignature: signDesignPreviewToken(SECRET, NOW),
    });
    assert.equal(result.designMode, true);
    assert.equal(result.isPreview, true);
  });

  it('enables design mode for an admin session', () => {
    const result = access({ previewParam: '1', adminSession: true });
    assert.equal(result.designMode, true);
  });

  it('ignores an expired signature and a signature without ?preview=1', () => {
    const signature = signDesignPreviewToken(SECRET, NOW - DESIGN_PREVIEW_TTL_MS - 1);
    assert.equal(access({ previewParam: '1', previewSignature: signature }).designMode, false);
    assert.equal(
      access({
        previewParam: null,
        previewSignature: signDesignPreviewToken(SECRET, NOW),
      }).designMode,
      false,
    );
  });

  it('does not treat the long-lived theme preview token as design mode', () => {
    const result = access({
      previewParam: '1',
      previewThemeId: 'theme1',
      previewToken: 'draft-token',
    });
    assert.equal(result.designMode, false);
    assert.equal(result.isPreview, true);
    assert.equal(result.previewThemeId, 'theme1');
    assert.equal(result.previewToken, 'draft-token');
  });
});
