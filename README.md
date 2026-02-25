# OhMyWrt Toolbox

[中文文档](README.zh-CN.md)

A self-hosted proxy subscription management tool — aggregate multiple upstream proxy sources, filter and group nodes on demand, and generate ready-to-use Clash / Sing-box subscription URLs with one click.

## ✨ Features

### 🔗 Proxy Subscription Management
- **Multi-source aggregation**: Add multiple upstream subscription URLs with per-source prefix, cache TTL, and enable/disable controls
- **Node filtering**: Keyword-based node filtering (built-in system defaults or custom JSONC rules)
- **Group management**: Flexible proxy group configuration (e.g. `🔰 Foreign Traffic`, `🏳️‍🌈 Google`, `✈️ Telegram`, `🎬 Netflix`, `🤖 AI`, `🐙 GitHub`, etc.)
- **Rule routing**: Per-service traffic routing rules
- **Dual-format output**: Generate both **Clash** (YAML) and **Sing-box** (JSON) configs from the same source
- **Public subscription URLs**: No-auth URLs that can be directly imported into proxy clients
- **Debug mode**: Real-time streaming view of the processing pipeline (fetch → filter → merge → output) with per-node tracing
- **Access statistics**: Download logs with type, IP, user-agent, and node count

### 🌐 Network Data Service
- **GeoIP China**: Aggregated China IPv4 CIDR list from APNIC, Loyalsoldier, and other sources
- **GeoSite China**: China domain list for DNS split routing

### 👥 Users & Permissions
- **Role hierarchy**: Superadmin > Admin > User, three-tier access control
- **User management**: Registration (with optional invitation codes), login, profile settings
- **Session management**: Session-based authentication

### 🏢 Workspaces
- **Multi-tenant**: Create multiple workspaces, each with independent subscriptions and data
- **Single-workspace mode**: Simplified URL structure for personal or small-team deployments
- **Member management**: Workspace-level membership and role control

### 🛡️ System Administration
- **System settings**: Toggle registration, single-workspace mode, and other global configs
- **Invitation codes**: Superadmin-issued, single-use, with optional expiration
- **User CRUD**: Full user management in the admin panel

### 🌍 Internationalization
9 languages supported: Simplified Chinese, Traditional Chinese, English, Japanese, German, Cantonese, Wu Chinese, Hakka, and Classical Chinese.

### 🎨 Themes
Light / dark theme switching, with system-follow option.

## 📚 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 7, TailwindCSS 4, Ant Design 6, TanStack Query, React Router v7, Framer Motion |
| **Backend** | NestJS 11, tRPC v11 (end-to-end type safety), Drizzle ORM, Zod v4 |
| **Database** | PostgreSQL 16 |
| **Infrastructure** | Docker Compose, pnpm Monorepo, Biome (lint/format) |

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.19 or >= 22.12
- pnpm >= 10.15.1 (recommended: `corepack enable`)
- Docker & Docker Compose

### First-time Setup

```bash
# One-command init (install deps, start DB, run migrations & seed)
make init

# Start the dev environment
make dev
```

> ⚠️ `make init` will wipe existing database data. Use with caution.

### Core Commands

```bash
make init    # First-time init (clean + install + migrate + seed)
make dev     # Start dev environment (DB + dev servers)
make build   # Build for production
make docker  # Build Docker images
```

### Dev Servers

After running `make dev`:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Database | localhost:5432 |

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password | Superadmin |
| user@example.com | password | User |

## 🐳 Docker Deployment

```bash
# Build images
make docker

# Start all services
docker compose up -d
```

Access the app at http://localhost:8080. The backend API is reverse-proxied via Nginx at `/trpc`.

See [DEPLOY.md](DEPLOY.md) for the full deployment guide.

## 📁 Project Structure

```
packages/
├── server/        # NestJS backend (tRPC API + Drizzle ORM)
│   └── src/
│       ├── db/        # Database schema & connection
│       ├── modules/   # Business modules
│       │   ├── admin/       # System admin (users, invitations, settings)
│       │   ├── auth/        # Authentication (login, register, sessions)
│       │   ├── proxy/       # Proxy subscription management (core feature)
│       │   ├── network/     # GeoIP/GeoSite data service
│       │   ├── workspace/   # Workspace management
│       │   ├── user/        # User profiles
│       │   └── todo/        # Workspace todos
│       └── trpc/      # tRPC router config & auto-generated types
├── web/           # React frontend (Vite + Ant Design)
│   └── src/
│       ├── components/  # UI components (proxy mgmt, account, dashboard)
│       ├── pages/       # Page routes
│       ├── hooks/       # Custom hooks (theme, auth, locale)
│       └── lib/         # Utilities (tRPC client, i18n)
├── types/         # Shared TypeScript types & Zod schemas
├── components/    # Reusable UI component library
└── i18n/          # i18n resources (9 languages)
```

## 🔗 Public Endpoints

The following endpoints require no authentication:

| Path | Purpose |
|------|---------|
| `/public/:uuid/clash` | Generate Clash YAML subscription config |
| `/public/:uuid/singbox` | Generate Sing-box JSON subscription config |
| `/public/network/geoip/cn` | China IPv4 CIDR list |
| `/public/network/geosite/cn` | China domain list |

## 📄 License

[BSD-3-Clause](LICENSE)
