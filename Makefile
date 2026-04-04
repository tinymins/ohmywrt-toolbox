.PHONY: init dev dev\:kill build docker lint gen\:api db\:sync help

# 默认目标
.DEFAULT_GOAL := help

# 镜像名称
SERVER_IMAGE := ohmywrt-toolbox-server
COMPOSE_DEV := docker compose -f docker/docker-compose.dev.yml --env-file .env

# 数据目录（从 .env 读取，默认 .data）
DATA_DIR := $(shell grep -s '^DATA_LOCAL_PATH=' .env | cut -d= -f2- || echo .data)
ifeq ($(DATA_DIR),)
  DATA_DIR := .data
endif

# 颜色输出
GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
NC     := \033[0m # No Color

help: ## 显示帮助信息
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "$(GREEN)  可用的 Make 命令$(NC)\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "  $(YELLOW)make init$(NC)      - 首次初始化项目（清理+安装+迁移）\n"
	@printf "  $(YELLOW)make dev$(NC)       - 启动开发环境（数据库+开发服务器）\n"
	@printf "  $(YELLOW)make dev:kill$(NC)  - 杀掉残留 dev 进程（释放端口）\n"
	@printf "  $(YELLOW)make build$(NC)     - 编译生产版本\n"
	@printf "  $(YELLOW)make docker$(NC)    - 构建 Docker 镜像（Rust + 前端）\n"
	@printf "  $(YELLOW)make lint$(NC)      - 代码检查（Biome lint & format）\n"
	@printf "  $(YELLOW)make gen:api$(NC)   - 从 Rust 生成 TypeScript 类型（ts-rs）\n"
	@printf "  $(YELLOW)make db:sync$(NC)   - 同步 schema 到 DB（prisma db push）\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"

init: ## 首次初始化项目（清理+安装+迁移）
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "$(GREEN)  🚀 项目初始化$(NC)\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)🔍 检查依赖项...$(NC)\n"
	@missing=""; \
	for cmd in node pnpm docker cargo rustc wasm-pack; do \
		if ! command -v $$cmd > /dev/null 2>&1; then \
			missing="$$missing  ✗ $$cmd\n"; \
		fi; \
	done; \
	if ! command -v docker-compose > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then \
		missing="$$missing  ✗ docker-compose (或 docker compose 插件)\n"; \
	fi; \
	if [ -n "$$missing" ]; then \
		printf "$(BLUE)$(NC)\n"; \
		printf "$(YELLOW)缺少必要依赖：$(NC)\n"; \
		printf "$$missing"; \
		printf "\n请安装后重试。\n"; \
		exit 1; \
	fi; \
	printf "$(GREEN)✓ node $(NC)$$(node --version)\n"; \
	printf "$(GREEN)✓ pnpm $(NC)$$(pnpm --version)\n"; \
	printf "$(GREEN)✓ docker $(NC)$$(docker --version | cut -d' ' -f3 | tr -d ',')\n"; \
	printf "$(GREEN)✓ cargo $(NC)$$(cargo --version | cut -d' ' -f2)\n"; \
	printf "$(GREEN)✓ wasm-pack $(NC)$$(wasm-pack --version | cut -d' ' -f2)\n"; \
	if ! command -v mold > /dev/null 2>&1; then \
		printf "$(YELLOW)⚠ mold 未安装（可选，加速链接）$(NC)\n"; \
	fi; \
	if ! command -v sccache > /dev/null 2>&1; then \
		printf "$(YELLOW)⚠ sccache 未安装（可选，加速编译缓存）$(NC)\n"; \
	fi
	@printf "\n"
	@printf "$(YELLOW)⚠️  警告：此操作将执行以下内容：$(NC)\n"
	@printf "  • 停止并删除现有数据库容器\n"
	@printf "  • 删除现有数据库数据（$(DATA_DIR)/postgres）\n"
	@printf "  • 重新安装依赖并迁移数据库\n"
	@printf "\n"
	@printf "$(YELLOW)确认继续？[y/N]: $(NC)"; \
	read confirm; \
	if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
		printf "$(GREEN)已取消初始化$(NC)\n"; \
		exit 1; \
	fi
	@printf "\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "$(GREEN)  开始初始化...$(NC)\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)📝 [1/9] 检查环境变量文件...$(NC)\n"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		printf "$(GREEN)✓ 已从 .env.example 创建根目录 .env 文件$(NC)\n"; \
	else \
		printf "$(GREEN)✓ 根目录 .env 文件已存在$(NC)\n"; \
	fi
	@printf "\n"
	@printf "$(YELLOW)🛑 [2/9] 停止现有数据库容器...$(NC)\n"
	@$(COMPOSE_DEV) down -v 2>/dev/null || true
	@printf "$(GREEN)✓ 容器已停止$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)🗑️  [3/9] 清理数据库数据目录...$(NC)\n"
	@sudo rm -rf $(DATA_DIR)/postgres
	@sudo chown -R $(shell id -u):$(shell id -g) $(DATA_DIR) 2>/dev/null || true
	@printf "$(GREEN)✓ 数据目录已清理$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)📁 [4/9] 创建数据目录...$(NC)\n"
	@mkdir -p $(DATA_DIR)/postgres $(DATA_DIR)/storage
	@printf "$(GREEN)✓ 数据目录已创建$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)📦 [5/9] 安装依赖...$(NC)\n"
	@pnpm install
	@printf "$(GREEN)✓ 依赖安装完成$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)🦀 [6/9] 构建 WASM 模块...$(NC)\n"
	@if [ -d packages/wasm ]; then \
		cd packages/wasm && wasm-pack build --target web; \
		printf "$(GREEN)✓ WASM 构建完成$(NC)\n"; \
	else \
		printf "$(YELLOW)⚠ packages/wasm 不存在，跳过$(NC)\n"; \
	fi
	@printf "\n"
	@printf "$(YELLOW)🐳 [7/9] 启动数据库容器...$(NC)\n"
	@$(COMPOSE_DEV) up -d
	@printf "$(GREEN)✓ 数据库已启动$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)⏳ [8/9] 等待数据库就绪...$(NC)\n"
	@sleep 5
	@$(COMPOSE_DEV) exec -T db pg_isready -U postgres > /dev/null 2>&1 || sleep 3
	@printf "$(GREEN)✓ 数据库就绪$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)🗃️  [9/9] 同步数据库 Schema...$(NC)\n"
	@npx prisma db push --schema prisma/schema.prisma
	@printf "$(GREEN)✓ 数据库 Schema 同步完成$(NC)\n"
	@printf "\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "$(GREEN)  ✨ 初始化完成！$(NC)\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)👉 运行 'make dev' 启动开发服务器$(NC)\n"
	@printf "\n"

dev: ## 启动开发环境（数据库+开发服务器）
	@./scripts/dev.sh

dev\:kill: ## 杀掉残留的 dev 进程（释放端口，给 make dev 让路）
	@./scripts/dev-kill.sh

build: ## 编译生产版本
	@printf "$(GREEN)🔨 开始编译...$(NC)\n"
	@pnpm build
	@printf "$(BLUE)→ 构建 Rust 二进制 (release)...$(NC)\n"
	@cd packages/server && cargo build --release
	@printf "$(GREEN)✓ 编译完成$(NC)\n"

docker: ## 构建 Docker 镜像（Rust + 前端）
	@printf "$(GREEN)🐳 构建 Docker 镜像...$(NC)\n"
	@printf "$(BLUE)→ 构建 Rust 二进制 (release)...$(NC)\n"
	@cd packages/server && cargo build --release
	@printf "$(BLUE)→ 构建 $(SERVER_IMAGE) 镜像（含前端）...$(NC)\n"
	@docker build -f packages/server/Dockerfile -t $(SERVER_IMAGE):latest .
	@printf "$(GREEN)✓ 镜像构建完成$(NC)\n"

gen\:api: ## 从 Rust 生成 TypeScript 类型（ts-rs）
	@printf "$(GREEN)🦀 生成 TypeScript 类型...$(NC)\n"
	@node scripts/gen-rust-api.mjs
	@printf "$(GREEN)✓ TypeScript 类型已生成$(NC)\n"

db\:sync: ## 同步 schema 到 DB（prisma db push）
	@printf "$(GREEN)🔄 同步数据库 schema...$(NC)\n"
	@npx prisma db push --schema prisma/schema.prisma
	@printf "$(GREEN)✓ db:sync 完成$(NC)\n"

lint: ## 代码检查（Biome lint & format）
	@printf "$(GREEN)🔍 代码检查中...$(NC)\n"
	@pnpm lint
	@printf "$(GREEN)✓ 代码检查通过$(NC)\n"
