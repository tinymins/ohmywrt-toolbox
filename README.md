# OhMyWRT Toolbox

Production-ready full-stack boilerplate: Rust (Axum) backend + React 19 SPA, managed as a pnpm monorepo. Ships with authentication, multi-workspace, i18n (5 languages), dark mode, WASM modules, and one-command Docker deployment.

[简体中文](README.zh-CN.md)

## Tech Stack

| Layer | Tech |
|-------|------|
| **Backend** | Rust (Axum) · Sea-ORM · PostgreSQL 18 |
| **Frontend** | React 19 · React Router v7 · TailwindCSS 4 · TanStack Query v5 |
| **WASM** | wasm-bindgen · wasm-pack |
| **Types** | Zod v4 · TypeScript 5.9 · ts-rs |
| **Build** | Turborepo · Vite 7 |
| **Dev Tools** | Cargo clippy · rustfmt · Biome · Docker Compose · pnpm 10 |
| **Mini Program** | Taro 4 · React 18 · WeChat |

## Quick Start

```bash
# First-time setup (creates .env, installs deps, starts DB, runs migrations)
make init

# Start dev environment
make dev
```

Dev servers:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5678

## Commands

```bash
make init      # First-time setup (creates .env, installs deps, starts DB, syncs schema)
make dev       # Start dev environment (DB + dev servers)
make build     # Production build
make docker    # Docker image build
make deploy    # One-command deploy to server
make lint      # Biome + Cargo clippy + typecheck
make gen:api   # Generate TypeScript types from Rust DTOs
```

## Project Structure

```
packages/
  server/       Rust (Axum + Sea-ORM) backend
  web/          React Router v7 SPA frontend
  wasm/         WebAssembly modules
  types/        Shared Zod schemas + TypeScript types
  components/   Generic UI components (TailwindCSS, no business logic)
  i18n/         Internationalization resources (5 languages)
  miniapp/      WeChat Mini Program (Taro 4)
```

## Features

- **End-to-end type safety**: Rust DTO → ts-rs → TypeScript, full-chain type safety with Zod v4 validation
- **SPA with client routing**: React Router v7 with code splitting and client loaders
- **Multi-workspace**: Switchable workspaces with role-based access
- **Admin panel**: Super admin / admin / user three-tier roles
- **Object storage**: OpenDAL abstraction (local filesystem, extensible to S3)
- **Internationalization**: 5 languages (zh-CN / en-US / de-DE / ja-JP / zh-TW)
- **Theming**: Light/dark mode + CSS variables + system preference detection
- **Strict dev toolchain**: Cargo workspace + clippy pedantic lints, rustfmt, Biome, Turborepo
- **One-command deployment**: Multi-stage Docker build with embedded SPA, deploy via SSH
- **Multi-platform**: React SPA + WeChat Mini Program (Taro 4) + WASM modules from one monorepo

## Deployment

See [DEPLOY.md](DEPLOY.md) for production deployment guide.

Docker Compose runs 2 services: PostgreSQL + Rust backend (with embedded frontend static files).

## Links

- [Axum](https://github.com/tokio-rs/axum) · [Sea-ORM](https://www.sea-ql.org/SeaORM/)
- [React](https://react.dev/) · [React Router](https://reactrouter.com/) · [TailwindCSS](https://tailwindcss.com/)
- [Biome](https://biomejs.dev/) · [OpenDAL](https://opendal.apache.org/)

## License

[MIT](LICENSE)
