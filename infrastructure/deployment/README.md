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
#   In production an empty CORS_ORIGINS rejects every browser Origin. Requests with no
#   Origin header still succeed. Set the same list on the API process.
#
# Cache flush (website + API):
#   Set the same REVALIDATE_SECRET on the website and the API (openssl rand -base64 32).
#   Production POST /api/revalidate returns 503 when it is unset and 401 for a bad bearer token.
#   Theme publish and menu saves send Authorization: Bearer $REVALIDATE_SECRET.
#
# Storefront design mode:
#   ?preview=1 does not enable design mode for anonymous visitors.
#   It requires an admin session cookie (same AUTH_SECRET; the cookie must be sent to the
#   website) or preview_sig, an HMAC signed with AUTH_SECRET that expires after 15 minutes.
#   Draft-theme cookies (zodyk_preview_theme, zodyk_preview_token) are Secure in production,
#   httpOnly, SameSite=Lax, and expire after 15 minutes. Document navigations copy a valid
#   pair into those cookies and then drop the query secrets so they do not stay in history.
#
# Performance defaults on the API process:
#   - Single long-lived Mongo connection (connect on boot, reused)
#   - compression + helmet + trust proxy
#   - HTTP keep-alive / requestTimeout (API_REQUEST_TIMEOUT_MS)
#   - API_BODY_LIMIT for multipart (default 100mb)
