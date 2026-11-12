import { readFile, writeFile } from 'node:fs/promises';

const sourceUrl = new URL('../src/routes/v1.ts', import.meta.url);
const outputUrl = new URL('../openapi.json', import.meta.url);
const source = await readFile(sourceUrl, 'utf8');
const mounts = [...source.matchAll(/\bmount\(\s*router\s*,\s*'([^']+)'\s*,\s*'([^']+)'/g)];
const mountCount = [...source.matchAll(/\bmount\(\s*router\s*,/g)].length;
if (mounts.length !== mountCount || mounts.length === 0) {
  throw new Error('Could not parse every route declaration; update the generator.');
}

const paths = {};
for (const [, method, route] of mounts) {
  if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
    throw new Error(`Unsupported method: ${method}`);
  }
  const names = [...route.matchAll(/[:*]([A-Za-z][A-Za-z0-9_]*)/g)].map((match) => match[1]);
  const path = route.replace(/[:*]([A-Za-z][A-Za-z0-9_]*)/g, '{$1}');
  paths[path] ??= {};
  if (paths[path][method]) throw new Error(`Duplicate operation: ${method} ${path}`);
  paths[path][method] = {
    ...(names.length ? { parameters: names.map((name) => ({ name, in: 'path', required: true, schema: { type: 'string' }, ...(route.includes(`*${name}`) ? { description: 'Slash-separated wildcard path.' } : {}) })) } : {}),
    responses: { default: { description: 'Response; status and schema are not yet documented.' } },
  };
}

// These details are checked against the mounted handlers; the remaining
// operations intentionally stay as route-only entries until reviewed.
const query = (name, schema) => ({ name, in: 'query', required: false, schema });
const pageNumber = { type: 'integer', minimum: 1, default: 1 };
const search = query('search', { type: 'string' });
const listingResponse = (lastPageKey) => ({
  description: 'Paginated listing',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['data', 'pagination'],
        properties: {
          data: { type: 'array', items: { type: 'object' } },
          pagination: {
            type: 'object',
            required: ['page', 'limit', 'total', lastPageKey],
            properties: Object.fromEntries(['page', 'limit', 'total', lastPageKey].map((name) => [name, { type: 'integer' }])),
          },
        },
      },
    },
  },
});
paths['/pages'].get.summary = 'List pages (requires pages:read)';
paths['/pages'].get.parameters = [
  query('page', pageNumber),
  query('limit', { type: 'integer', minimum: 1, maximum: 100, default: 20 }),
  search,
  query('status', { type: 'string', enum: ['draft', 'published', 'scheduled', 'archived'] }),
];
paths['/pages'].get.responses = { 200: listingResponse('pages') };
paths['/media'].get.summary = 'List media (requires media:read)';
paths['/media'].get.parameters = [
  query('page', pageNumber),
  query('limit', { type: 'integer', minimum: 1, maximum: 100, default: 24 }),
  search,
  query('folder', { type: 'string', default: '/' }),
  query('mimeType', { type: 'string' }),
];
paths['/media'].get.responses = { 200: listingResponse('totalPages') };
paths['/media/upload'].post.summary = 'Upload media (requires media:upload)';
paths['/media/upload'].post.requestBody = {
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        required: ['file'],
        properties: {
          file: { type: 'string', format: 'binary' },
          folder: { type: 'string' },
          alt: { type: 'string' },
          title: { type: 'string' },
          caption: { type: 'string' },
        },
      },
    },
  },
};
paths['/media/upload'].post.responses = { 201: { description: 'Media asset created' } };

const spec = {
  openapi: '3.1.0',
  info: { title: 'Zodyk API route inventory', version: '0.1.0', description: 'Generated from the v1 route declarations. Most request bodies, response schemas, authentication, and query parameters are not yet documented. Wildcards represent slash-separated paths.' },
  servers: [{ url: '/api/v1' }],
  paths,
};
const output = `${JSON.stringify(spec, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (await readFile(outputUrl, 'utf8').catch(() => '') !== output) {
    throw new Error('openapi.json is out of date; run node apps/api/scripts/generate-openapi.mjs');
  }
  console.log(`OpenAPI route inventory is current (${mounts.length} operations).`);
} else {
  await writeFile(outputUrl, output);
  console.log(`Wrote ${mounts.length} operations.`);
}
