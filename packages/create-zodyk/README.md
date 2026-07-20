# create-zodyk

Scaffold and set up a self-hosted [Zodyk](https://github.com/morningstar620/Zodyk) project with a single command — the same way you'd bootstrap a Next.js or Vite app.

```bash
npm create zodyk@latest my-site
# or
pnpm create zodyk my-site
# or
npx create-zodyk my-site
```

## What it does

1. Downloads the Zodyk project template into your target directory.
2. Runs an interactive setup wizard:
   - **Required:** MongoDB URI, admin email, admin password.
   - **Optional:** Redis, Cloudflare R2 (media/theme storage), SMTP email.
3. Generates a `.env` with freshly generated `AUTH_SECRET` and `ENCRYPTION_KEY`.
4. Installs dependencies with your package manager (pnpm by default).
5. Optionally starts MongoDB + Redis (`--start-docker`) and seeds the database (`--seed`).
6. Prints your admin URL and login summary.

## Options

| Flag | Description |
|------|-------------|
| `--template <src>` | Template source for `giget` (default `github:morningstar620/Zodyk#main`) |
| `--pm <manager>` | Package manager: `pnpm` \| `npm` \| `yarn` \| `bun` |
| `--no-install` | Skip installing dependencies |
| `--start-docker` | Start MongoDB + Redis via docker compose |
| `--seed` | Seed the database after install |
| `-y, --yes` | Accept defaults, run non-interactively |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

## Requirements

- Node.js 20+
- pnpm 9+ (Zodyk is a pnpm workspace)
- Docker (for local MongoDB + Redis)

## Development

```bash
pnpm --filter create-zodyk build
node packages/create-zodyk/dist/index.js --help
```
