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
COPY packages/wasm/package.json packages/wasm/

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages/i18n packages/i18n
COPY packages/types packages/types
COPY packages/components packages/components
COPY packages/wasm/pkg packages/wasm/pkg
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

# Install runtime deps + sing-box binary for config validation
ARG SINGBOX_VERSION=1.11.0
RUN apt-get update && \
    apt-get install -y --no-install-recommends libssl3 ca-certificates curl && \
    ARCH=$(dpkg --print-architecture) && \
    curl -fsSL "https://github.com/SagerNet/sing-box/releases/download/v${SINGBOX_VERSION}/sing-box-${SINGBOX_VERSION}-linux-${ARCH}.tar.gz" -o /tmp/sb.tar.gz && \
    tar -xzf /tmp/sb.tar.gz -C /tmp && \
    mv /tmp/sing-box-${SINGBOX_VERSION}-linux-${ARCH}/sing-box /usr/local/bin/sing-box && \
    chmod +x /usr/local/bin/sing-box && \
    rm -rf /tmp/sb.tar.gz /tmp/sing-box-* && \
    apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Prisma schema + config (for db push migrations)
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm install prisma@7 --save-dev 2>/dev/null

# Rust binary (pre-built release — cargo build --release runs before docker build)
COPY packages/server/target/release/ohmywrt-toolbox-server /usr/local/bin/

# Frontend static files
COPY --from=web-builder /app/packages/web/build/client /app/web

ENV STATIC_DIR=/app/web
EXPOSE 5678

CMD ["ohmywrt-toolbox-server"]
