# 构建阶段
FROM node:20-alpine AS builder

# 启用 corepack 以使用 pnpm
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

WORKDIR /app

# 复制 workspace 配置文件
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json ./

# 复制依赖包（i18n, components, types）
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/i18n/tsconfig.json ./packages/i18n/
COPY packages/i18n/src ./packages/i18n/src

COPY packages/components/package.json ./packages/components/
COPY packages/components/tsconfig.json ./packages/components/
COPY packages/components/src ./packages/components/src

COPY packages/types/package.json ./packages/types/
COPY packages/types/tsconfig.json ./packages/types/
COPY packages/types/src ./packages/types/src

# 复制 web 包
COPY packages/web/package.json ./packages/web/
COPY packages/web/tsconfig.json ./packages/web/

# 安装所有依赖
RUN pnpm install --frozen-lockfile

# 复制源代码和配置文件
COPY packages/web/src ./packages/web/src
COPY packages/web/index.html ./packages/web/
COPY packages/web/vite.config.ts ./packages/web/
COPY packages/web/postcss.config.js ./packages/web/
COPY packages/web/tailwind.config.js ./packages/web/

# 构建应用
WORKDIR /app/packages/web
RUN pnpm build

# 生产阶段 - 使用 nginx 提供静态文件
FROM nginx:alpine AS runner

# 复制 nginx 配置
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 代理 /trpc 请求到后端服务
    location /trpc {
        proxy_pass http://server:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 处理 React Router 的客户端路由
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 从构建阶段复制构建产物
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
