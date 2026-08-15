/**
 * Lightweight smoke checks for the Express API.
 * Usage: API_URL=http://localhost:5002 pnpm --filter @zodyk/api-server smoke
 */
const base = (process.env.API_URL ?? 'http://127.0.0.1:5002').replace(/\/$/, '');

async function check(path: string, expectStatuses: number | number[] = 200) {
  const expected = Array.isArray(expectStatuses) ? expectStatuses : [expectStatuses];
  const url = `${base}${path}`;
  const res = await fetch(url);
  if (!expected.includes(res.status)) {
    throw new Error(`${path} expected ${expected.join('|')}, got ${res.status}`);
  }
  console.log(`ok ${path} → ${res.status}`);
  return res.json().catch(() => null);
}

async function main() {
  await check('/healthz', 200);
  // 200 when Mongo is up, 503 when still connecting (liveness vs readiness).
  await check('/readyz', [200, 503]);

  // Unauthenticated business route should fail closed (401/403), not 404.
  const res = await fetch(`${base}/api/v1/users`);
  if (res.status === 404) {
    throw new Error('/api/v1/users returned 404 — route registry may be incomplete');
  }
  if (![401, 403].includes(res.status)) {
    console.warn(`warn /api/v1/users → ${res.status} (expected 401/403 without session)`);
  } else {
    console.log(`ok /api/v1/users → ${res.status} (auth required)`);
  }

  // Webhook path must exist without session.
  const webhook = await fetch(`${base}/api/v1/payments/webhooks/stripe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  if (webhook.status === 404) {
    throw new Error('webhook route missing');
  }
  console.log(`ok /api/v1/payments/webhooks/stripe → ${webhook.status}`);

  console.log('smoke checks passed');
}

main().catch((error) => {
  console.error('smoke failed', error);
  process.exit(1);
});
