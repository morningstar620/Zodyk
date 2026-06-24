import { createRequire } from 'node:module';

type SharpModule = typeof import('sharp');

let cached: SharpModule | null = null;

/**
 * Load sharp via Node resolution so Next.js does not bundle native bindings.
 */
export async function loadSharp(): Promise<SharpModule> {
  if (cached) return cached;

  try {
    const mod = await import('sharp');
    cached = mod.default;
    return cached;
  } catch {
    const require = createRequire(process.cwd() + '/');
    cached = require('sharp') as SharpModule;
    return cached;
  }
}
