import { existsSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const srcRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), '../src');

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const target = resolvePath(srcRoot, specifier.slice(2));
    const candidates = [`${target}.ts`, `${target}.tsx`, resolvePath(target, 'index.ts')];
    const file = candidates.find((candidate) => existsSync(candidate));
    if (file) return nextResolve(pathToFileURL(file).href, context);
  }
  return nextResolve(specifier, context);
}
