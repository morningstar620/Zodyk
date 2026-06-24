# Zodyk

Open-source, self-hostable website operating system — modern CMS, themes, SEO, forms, and more.

This repository is the **v1.0 Foundation scaffold**: monorepo structure, stub packages, and two Next.js apps ready for feature development.

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Docker** (for local MongoDB and Redis)

## Quick start

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

### 4. Run development servers

```bash
pnpm dev
```

| App | URL |
|-----|-----|
| Admin panel | http://localhost:3000 |
| Public website | http://localhost:3001 |

### 5. Build

```bash
pnpm build
```

## Monorepo structure

```
apps/
  admin/          # Administration panel (Next.js)
  website/        # Public site renderer (Next.js)

packages/
  core/           # Shared types, Zod schemas, primitives
  auth/           # Authentication & RBAC (stub)
  database/       # Mongoose connection helper
  seo/            # SEO platform (stub)
  media/          # Media library (stub)
  liquid/         # Liquid template engine (stub)
  workflow/       # Automation engine (stub)
  forms/          # Form builder (stub)
  notifications/  # Email/SMS/WhatsApp (stub)
  payments/       # Payments module (stub)
  builder/        # Visual builder (stub)
  theme-engine/   # Theme install/export (stub)
  api/            # REST & GraphQL API (stub)
  shared-ui/      # Design system (shadcn-style components)

infrastructure/
  docker/         # Docker Compose for local dev
  scripts/        # Seed & migration utilities (placeholder)
  deployment/     # Vercel / K8s config stubs
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint across the workspace |
| `pnpm typecheck` | Type-check across the workspace |
| `pnpm docker:up` | Start MongoDB and Redis |
| `pnpm docker:down` | Stop local Docker services |

## Documentation

See [doc.md](./doc.md) for the full product requirements and architecture vision.

## License

TBD — open-source permissive license planned.
