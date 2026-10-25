import { createRequire } from 'node:module';
import type sharp from 'sharp';

type SharpFn = typeof sharp;

let cached: SharpFn | null = null;

/**
 * Load sharp via Node resolution so Next.js does not bundle native bindings.
 */
export async function loadSharp(): Promise<SharpFn> {
  if (cached) return cached;

  try {
    const mod = await import('sharp');
    cached = (mod.default ?? mod) as SharpFn;
    return cached;
  } catch {
    const require = createRequire(process.cwd() + '/');
    cached = require('sharp') as SharpFn;
    return cached;
  }
}
