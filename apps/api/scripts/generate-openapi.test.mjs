import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const generator = fileURLToPath(new URL('./generate-openapi.mjs', import.meta.url));
const sourceUrl = new URL('../src/routes/v1.ts', import.meta.url);
const specUrl = new URL('../openapi.json', import.meta.url);

test('committed inventory matches all mounted routes and key endpoint contracts', async () => {
  execFileSync(process.execPath, [generator, '--check']);
  const source = await readFile(sourceUrl, 'utf8');
  const spec = JSON.parse(await readFile(specUrl, 'utf8'));
  const routes = [...source.matchAll(/\bmount\(\s*router\s*,\s*'([^']+)'\s*,\s*'([^']+)'/g)];
  assert.equal(Object.values(spec.paths).flatMap((path) => Object.keys(path)).length, routes.length);
  for (const [, method, route] of routes) {
    const path = route.replace(/[:*]([A-Za-z][A-Za-z0-9_]*)/g, '{$1}');
    assert.ok(spec.paths[path]?.[method], `${method} ${route}`);
  }
  assert.deepEqual(spec.paths['/pages'].get.parameters.map((p) => p.name), ['page', 'limit', 'search', 'status']);
  assert.deepEqual(spec.paths['/media'].get.parameters.map((p) => p.name), ['page', 'limit', 'search', 'folder', 'mimeType']);
  assert.deepEqual(spec.paths['/media/upload'].post.requestBody.content['multipart/form-data'].schema.required, ['file']);
  assert.equal(spec.paths['/media/upload'].post.responses['201'].description, 'Media asset created');
});

test('generator detects stale output and rejects unsupported route declarations', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'zodyk-openapi-'));
  try {
    await mkdir(join(temp, 'scripts'));
    await mkdir(join(temp, 'src', 'routes'), { recursive: true });
    const copy = join(temp, 'scripts', 'generate-openapi.mjs');
    const routeFile = join(temp, 'src', 'routes', 'v1.ts');
    await writeFile(copy, await readFile(generator));
    const original = await readFile(sourceUrl, 'utf8');
    await writeFile(routeFile, original);
    execFileSync(process.execPath, [copy]);
    await writeFile(routeFile, `${original}\nmount(router, 'get', '/new-route', handler);\n`);
    assert.notEqual(spawnSync(process.execPath, [copy, '--check']).status, 0);
    await writeFile(routeFile, `${original}\nmount(router, variableMethod, '/bad', handler);\n`);
    assert.notEqual(spawnSync(process.execPath, [copy]).status, 0);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
