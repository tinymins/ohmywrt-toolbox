FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json ./

COPY packages/i18n/package.json ./packages/i18n/
COPY packages/i18n/tsconfig.json ./packages/i18n/
COPY packages/i18n/src ./packages/i18n/src

COPY packages/components/package.json ./packages/components/
COPY packages/components/tsconfig.json ./packages/components/
COPY packages/components/src ./packages/components/src

COPY packages/types/package.json ./packages/types/
COPY packages/types/tsconfig.json ./packages/types/
COPY packages/types/src ./packages/types/src

COPY packages/web/package.json ./packages/web/
COPY packages/web/tsconfig.json ./packages/web/

COPY packages/server/package.json ./packages/server/

RUN pnpm install --frozen-lockfile

COPY packages/web/src ./packages/web/src
COPY packages/web/public ./packages/web/public
COPY packages/web/index.html ./packages/web/
COPY packages/web/vite.config.ts ./packages/web/
COPY packages/web/react-router.config.ts ./packages/web/
COPY packages/web/postcss.config.js ./packages/web/
COPY packages/web/server.mjs ./packages/web/

ARG VITE_STORAGE_PUBLIC_URL
ENV VITE_STORAGE_PUBLIC_URL=${VITE_STORAGE_PUBLIC_URL}
WORKDIR /app/packages/web
RUN pnpm build

WORKDIR /app
RUN pnpm --filter @acme/web deploy --legacy --prod /deploy

FROM oven/bun:1-alpine AS runner

WORKDIR /app

COPY --from=builder /deploy ./
COPY --from=builder /app/packages/web/build ./build
COPY --from=builder /app/packages/web/server.mjs ./server.mjs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "server.mjs"]
