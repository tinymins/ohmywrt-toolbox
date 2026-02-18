#!/bin/bash
# 开发环境启动脚本 - 自动在退出时停止数据库

set -e

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}正在停止数据库...${NC}"
    docker-compose stop db 2>/dev/null || true
    echo -e "${GREEN}✓ 数据库已停止${NC}"
}

# 注册 trap - 无论如何退出都执行清理
trap cleanup EXIT INT TERM

echo -e "${GREEN}🚀 启动开发环境...${NC}"
docker-compose up -d db
echo -e "${GREEN}✓ 数据库已启动${NC}"
echo -e "${YELLOW}启动开发服务器 (Ctrl+C 停止并自动关闭数据库)...${NC}"

# 运行 pnpm dev
pnpm dev
