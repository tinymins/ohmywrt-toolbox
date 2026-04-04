#!/bin/bash
# 开发环境启动脚本 - 自动在退出时停止数据库

set -e

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# ── 环境变量检测 ──────────────────────────────────────────
# 检查 .env 是否包含 .env.example 中所有必需的（未注释）字段
check_env() {
  local example="$1"
  local target="${example%.example}"
  local label="$2"

  if [ ! -f "$target" ]; then
    echo -e "${RED}✗ 缺少 ${label} — 请从 ${example} 复制：${NC}"
    echo -e "  cp ${example} ${target}"
    return 1
  fi

  local missing=()
  while IFS='=' read -r key _; do
    if ! grep -q "^${key}=" "$target" 2>/dev/null; then
      missing+=("$key")
    fi
  done < <(grep -E '^[A-Za-z_][A-Za-z_0-9]*=' "$example")

  if [ ${#missing[@]} -gt 0 ]; then
    echo -e "${RED}✗ ${target} 缺少以下字段（已在 ${example} 中新增）：${NC}"
    for k in "${missing[@]}"; do
      echo -e "  ${YELLOW}${k}${NC}=$(grep "^${k}=" "$example" | cut -d= -f2-)"
    done
    echo -e "  请将上述字段添加到 ${target}"
    return 1
  fi

  return 0
}

env_ok=true
check_env ".env.example" "根目录 .env" || env_ok=false

if [ "$env_ok" = false ]; then
  echo ""
  echo -e "${RED}环境变量检测未通过，请补全后重新启动${NC}"
  exit 1
fi
echo -e "${GREEN}✓ 环境变量检测通过${NC}"

# ── 加载根目录 .env（供后续 docker compose 使用）──────────
set -a
[ -f .env ] && . .env
set +a

# ── 启动 ──────────────────────────────────────────────────

echo -e "${GREEN}🚀 启动开发环境...${NC}"
DATA_DIR="${DATA_LOCAL_PATH:-.data}"
mkdir -p "$DATA_DIR/postgres" "$DATA_DIR/redis" "$DATA_DIR/minio"
docker compose -f docker/docker-compose.dev.yml --env-file .env up -d
echo -e "${GREEN}✓ 数据库、Redis、MinIO 已启动${NC}"

echo -e "${YELLOW}启动开发服务器 (Ctrl+C 停止并自动关闭服务)...${NC}"

pnpm dev
