import nodeCrypto from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import { generateBackupCodes } from './setup';

describe('generateBackupCodes', () => {
  it('draws codes from cryptographic randomness', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random must not generate backup codes');
    });
    const randomBytes = vi.spyOn(nodeCrypto, 'randomBytes');

    const codes = generateBackupCodes();

    expect(randomBytes).toHaveBeenCalled();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    }

    random.mockRestore();
    randomBytes.mockRestore();
  });
});
