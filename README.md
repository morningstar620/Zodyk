# Zodyk

Open-source, self-hostable website operating system — modern CMS, themes, SEO, forms, and more.

This repository is an active monorepo with three applications: a Next.js admin panel, a Next.js public website, and an Express REST API. Several platform packages are implemented; Forms, Workflow, and Notifications are currently planned stubs.

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Docker** (for local MongoDB and Redis)

## Quick start (one command)

Scaffold and configure a new project the same way you would with Next.js or Vite:

```bash
npm create zodyk@latest my-site
# or: pnpm create zodyk my-site
# or: npx create-zodyk my-site
```

This downloads the project, runs a setup wizard (MongoDB URI, admin account, optional R2/SMTP),
generates `.env` with fresh secrets, and installs dependencies. See
[`packages/create-zodyk`](./packages/create-zodyk) for all flags.

## Manual setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local services

```bash
pnpm docker:up
```

This starts MongoDB (`localhost:27017`) and Redis (`localhost:6379`).

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` as needed for local development.

In production, set `REVALIDATE_SECRET` (same value on the website and the API) and `CORS_ORIGINS` (admin and website origins). An empty CORS allow-list rejects browser origins, and cache flush rejects requests that do not send `Authorization: Bearer $REVALIDATE_SECRET`. See [infrastructure/deployment/README.md](./infrastructure/deployment/README.md).

**Theme storage:** By default in development, themes use the local filesystem (`THEME_STORAGE=local`, files under `themes/{slug}`). Customizer and code-editor saves write directly to those files. In production, set `THEME_STORAGE=r2` (and configure R2) so theme edits are stored in Cloudflare R2. Media library storage stays independent of theme storage.

### 4. Run development servers

```bash
pnpm dev
```

| App | URL |
|-----|-----|
| Admin panel | http://localhost:5001 |
| Public website | http://localhost:5003 |

> Tip: run a single app with `pnpm --filter @zodyk/admin dev`, `pnpm --filter @zodyk/website dev`, or `pnpm --filter @zodyk/api-server dev`.

### 5. Build

```bash
pnpm build
```

## Monorepo structure

```
apps/
  admin/          # Administration panel (Next.js + NextAuth)
  website/        # Public website renderer (Next.js)
  api/            # REST API (Express) — Docker / self-hosted

packages/
  core/           # Shared types, Zod schemas, primitives
  auth/           # Authentication, sessions, and RBAC
  database/       # Mongoose connection helper
  seo/            # SEO metadata, sitemap, robots, and redirect helpers
  media/          # Media library and storage
  liquid/         # Liquid template rendering (isolated VM sandboxing is planned)
  workflow/       # Planned stub
  forms/          # Planned stub
  notifications/  # Planned stub
  payments/       # Payment gateway layer (Stripe, Razorpay, Custom, …)
  builder/        # Visual builder
  theme-engine/   # Theme install, export, and storage
  api/            # REST API handlers and routes
  shared-ui/      # Design system (shadcn-style components)
  theme-language/ # Theme language support
  theme-lsp/      # Theme language server
  create-zodyk/   # Project creation CLI

infrastructure/
  docker/         # Docker Compose for local dev
  scripts/        # Seed and migration utilities
  deployment/     # Vercel config and Cloudflare CDN worker
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint across the workspace |
| `pnpm typecheck` | Type-check across the workspace |
| `pnpm docker:up` | Start MongoDB, Redis, and the API |
| `pnpm docker:down` | Stop local Docker services |
| `pnpm seed` | Create indexes, run seed-time migrations, and seed default data |
| `pnpm migrate:themes-r2` | Migrate themes to Cloudflare R2 |
| `pnpm migrate:remove-homepage` | Remove legacy homepage pages |

## Documentation

See [doc.md](./doc.md) for the full product requirements and architecture vision.

## License

MIT
