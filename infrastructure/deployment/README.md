# Deploy targets
#
# - admin / website: Vercel Next.js projects (see vercel.json)
# - api: Docker image `apps/api/Dockerfile` on your host (Compose, Fly, Railway, VPS, K8s)
#
# Local:
#   pnpm docker:up          # mongo + redis + api
#   pnpm --filter @zodyk/api-server dev
#   pnpm --filter @zodyk/admin dev
#   pnpm --filter @zodyk/website dev
#
# Admin proxies /api/v1/* to API_UPSTREAM_URL (defaults to http://127.0.0.1:5002 in development).
# Keep /api/auth/* on the admin app (NextAuth). Point payment webhooks at API_URL (not the Vercel host).
#
# Production (Vercel admin):
#   Set API_UPSTREAM_URL to the reachable Docker API origin, e.g. https://api.example.com
#   Vercel rewrite body/timeout limits apply to proxied uploads. If theme/media uploads fail
#   at the edge, call API_URL directly from those clients with CORS_ORIGINS including ADMIN_URL.
#
# Performance defaults on the API process:
#   - Single long-lived Mongo connection (connect on boot, reused)
#   - compression + helmet + trust proxy
#   - HTTP keep-alive / requestTimeout (API_REQUEST_TIMEOUT_MS)
#   - API_BODY_LIMIT for multipart (default 100mb)
