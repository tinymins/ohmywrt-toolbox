.PHONY: init dev build docker help

# 读取环境变量（如果存在）
-include .env

# 默认目标
.DEFAULT_GOAL := help

# 镜像名称
SERVER_IMAGE := apps-server
WEB_IMAGE := apps-web
COMPOSE_FILE := docker-compose.yml

# 颜色输出
GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
NC     := \033[0m # No Color

help: ## 显示帮助信息
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "$(GREEN)  可用的 Make 命令$(NC)\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "  $(YELLOW)make init$(NC)   - 首次初始化项目（清理+安装+迁移+种子）\n"
	@printf "  $(YELLOW)make dev$(NC)    - 启动开发环境（数据库+开发服务器）\n"
	@printf "  $(YELLOW)make build$(NC)  - 编译生产版本\n"
	@printf "  $(YELLOW)make docker$(NC) - 构建并启动 Docker 容器\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"

init: ## 首次初始化项目（清理+安装+迁移+种子）
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "$(GREEN)  🚀 项目初始化$(NC)\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)⚠️  警告：此操作将执行以下内容：$(NC)\n"
	@printf "  • 停止并删除现有数据库容器\n"
	@printf "  • 删除现有数据库数据（.data/postgres）\n"
	@printf "  • 重新安装依赖、迁移并注入种子数据\n"
	@printf "\n"
	@printf "$(YELLOW)确认继续？[y/N]: $(NC)"; \
	read confirm; \
	if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
		printf "$(GREEN)已取消初始化$(NC)\n"; \
		exit 0; \
	fi
	@printf "\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "$(GREEN)  开始初始化...$(NC)\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)📝 [1/9] 检查环境变量文件...$(NC)\n"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		printf "$(GREEN)✓ 已从 .env.example 创建根目录 .env 文件（用于 Docker）$(NC)\n"; \
	else \
		printf "$(GREEN)✓ 根目录 .env 文件已存在$(NC)\n"; \
	fi
	@if [ ! -f packages/server/.env ]; then \
		cp packages/server/.env.example packages/server/.env; \
		printf "$(GREEN)✓ 已从 .env.example 创建 server .env 文件$(NC)\n"; \
	else \
		printf "$(GREEN)✓ server .env 文件已存在$(NC)\n"; \
	fi
	@if [ ! -f packages/web/.env ]; then \
		cp packages/web/.env.example packages/web/.env; \
		printf "$(GREEN)✓ 已从 .env.example 创建 web .env 文件$(NC)\n"; \
	else \
		printf "$(GREEN)✓ web .env 文件已存在$(NC)\n"; \
	fi
	@printf "\n"
	@printf "$(YELLOW)🛑 [2/9] 停止现有数据库容器...$(NC)\n"
	@docker-compose down -v 2>/dev/null || true
	@printf "$(GREEN)✓ 容器已停止$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)🗑️  [3/9] 清理数据库数据目录...$(NC)\n"
	@sudo rm -rf .data/postgres
	@printf "$(GREEN)✓ 数据目录已清理$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)📁 [4/9] 创建数据目录...$(NC)\n"
	@mkdir -p .data/postgres
	@printf "$(GREEN)✓ 数据目录已创建$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)📦 [5/9] 安装依赖...$(NC)\n"
	@pnpm install
	@printf "$(GREEN)✓ 依赖安装完成$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)🐳 [6/9] 启动数据库容器...$(NC)\n"
	@docker-compose up -d db
	@printf "$(GREEN)✓ 数据库已启动$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)⏳ [7/9] 等待数据库就绪...$(NC)\n"
	@sleep 5
	@docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1 || sleep 3
	@printf "$(GREEN)✓ 数据库就绪$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)🗃️  [8/9] 执行数据库迁移...$(NC)\n"
	@pnpm --filter @acme/server db:migrate
	@printf "$(GREEN)✓ 数据库迁移完成$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)🌱 [9/9] 执行数据库种子...$(NC)\n"
	@pnpm --filter @acme/server db:seed
	@printf "$(GREEN)✓ 数据库种子完成$(NC)\n"
	@printf "\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "$(GREEN)  ✨ 初始化完成！$(NC)\n"
	@printf "$(BLUE)═══════════════════════════════════════$(NC)\n"
	@printf "\n"
	@printf "$(YELLOW)👉 运行 'make dev' 启动开发服务器$(NC)\n"
	@printf "\n"

dev: ## 启动开发环境（数据库+开发服务器）
	@printf "$(GREEN)� 启动开发环境...$(NC)\n"
	@docker-compose up -d db
	@printf "$(GREEN)✓ 数据库已启动$(NC)\n"
	@printf "$(YELLOW)启动开发服务器...$(NC)\n"
	@pnpm dev

build: ## 编译生产版本
	@printf "$(GREEN)�🔨 开始编译...$(NC)\n"
	@pnpm build
	@printf "$(GREEN)✓ 编译完成$(NC)\n"

docker: ## 构建 Docker 容器
	@printf "$(GREEN)🐳 构建 Docker 镜像...$(NC)\n"
	@docker build -f packages/server/Dockerfile -t $(SERVER_IMAGE):latest .
	@docker build -f packages/web/Dockerfile -t $(WEB_IMAGE):latest .
	@printf "$(GREEN)✓ 镜像构建完成$(NC)\n"