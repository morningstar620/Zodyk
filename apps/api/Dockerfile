# Zodyk API — multi-stage build for the monorepo Express server.
# Build from repo root:
#   docker build -f apps/api/Dockerfile -t zodyk-api .

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/admin/package.json ./apps/admin/
COPY apps/website/package.json ./apps/website/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/core/package.json ./packages/core/
COPY packages/database/package.json ./packages/database/
COPY packages/media/package.json ./packages/media/
COPY packages/payments/package.json ./packages/payments/
COPY packages/theme-engine/package.json ./packages/theme-engine/
COPY packages/theme-language/package.json ./packages/theme-language/
COPY packages/theme-lsp/package.json ./packages/theme-lsp/
COPY packages/liquid/package.json ./packages/liquid/
COPY packages/shared-ui/package.json ./packages/shared-ui/
COPY packages/builder/package.json ./packages/builder/
COPY packages/seo/package.json ./packages/seo/
COPY packages/forms/package.json ./packages/forms/
COPY packages/notifications/package.json ./packages/notifications/
COPY packages/workflow/package.json ./packages/workflow/
COPY packages/create-zodyk/package.json ./packages/create-zodyk/
RUN pnpm install --frozen-lockfile

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app ./
COPY apps/api ./apps/api
COPY packages ./packages

EXPOSE 5002
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:5002/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/apps/api
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
