# ============================================================
# Stage 1: Web 前端构建
# ============================================================
FROM node:20-alpine AS web-builder

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/web/package.json packages/web/
COPY packages/components/package.json packages/components/
COPY packages/types/package.json packages/types/
COPY packages/i18n/package.json packages/i18n/

RUN pnpm install --frozen-lockfile

COPY packages/i18n packages/i18n
COPY packages/types packages/types
COPY packages/components packages/components
COPY packages/web packages/web
COPY tsconfig.base.json biome.json turbo.json ./

RUN pnpm --filter @acme/i18n build && \
    pnpm --filter @acme/types build && \
    pnpm --filter @acme/components build && \
    pnpm --filter @acme/web build

# ============================================================
# Stage 2: 最终镜像
# ============================================================
FROM node:20-trixie-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends libssl3 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Prisma schema (for db push migrations)
COPY prisma ./prisma
RUN npm install -g prisma@6

# Rust binary (pre-built release — cargo build --release runs before docker build)
COPY packages/server/target/release/rs-fullstack-server /usr/local/bin/

# Frontend static files
COPY --from=web-builder /app/packages/web/dist /app/web

ENV STATIC_DIR=/app/web
EXPOSE 5678

CMD ["rs-fullstack-server"]
