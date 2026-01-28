#!/bin/bash

# =============================================================================
# apps 一键部署脚本
# =============================================================================

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 加载配置文件
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"

if [ ! -f "$ENV_FILE" ]; then
    log_error "配置文件不存在: $ENV_FILE"
    log_info ""
    log_info "请先创建配置文件:"
    log_info "  cp ${ENV_EXAMPLE} ${ENV_FILE}"
    log_info ""
    log_info "然后根据你的环境修改配置:"
    log_info "  - DEPLOY_SERVER: SSH 服务器地址"
    log_info "  - DEPLOY_REMOTE_DIR: 服务器部署目录"
    exit 1
fi

# 加载环境变量
set -a
source "$ENV_FILE"
set +a

# 检查必填环境变量
check_required_var() {
    local var_name="$1"
    local var_value="${!var_name}"
    if [ -z "$var_value" ]; then
        log_error "环境变量 $var_name 未配置"
        exit 1
    fi
}

check_required_var "DEPLOY_SERVER"
check_required_var "DEPLOY_LOCAL_TMP"
check_required_var "DEPLOY_REMOTE_TMP"
check_required_var "DEPLOY_REMOTE_DIR"
check_required_var "DEPLOY_IMAGE_FILE"

# 使用环境变量
SERVER="$DEPLOY_SERVER"
LOCAL_TMP="$DEPLOY_LOCAL_TMP"
REMOTE_TMP="$DEPLOY_REMOTE_TMP"
REMOTE_DIR="$DEPLOY_REMOTE_DIR"
IMAGE_FILE="$DEPLOY_IMAGE_FILE"

cd "$PROJECT_ROOT"
log_info "工作目录: $PROJECT_ROOT"
log_info "目标服务器: $SERVER"
log_info "部署目录: $REMOTE_DIR"

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -b, --build-only     仅构建镜像，不上传和部署"
    echo "  -u, --upload-only    仅上传镜像（跳过构建）"
    echo "  -d, --deploy-only    仅在服务器部署（跳过构建和上传）"
    echo "  -m, --migrate        部署后执行数据库迁移"
    echo "  -s, --seed           部署后执行种子数据"
    echo "  -r, --restart        仅重启服务"
    echo "  -l, --logs           查看服务日志"
    echo "  -h, --help           显示帮助"
    echo ""
    echo "示例:"
    echo "  $0                   完整部署（构建 + 上传 + 部署）"
    echo "  $0 -m                完整部署并执行数据库迁移"
    echo "  $0 -m -s             完整部署并执行迁移和种子数据"
    echo "  $0 -b                仅本地构建"
    echo "  $0 -d -m             仅部署并迁移（使用已上传的镜像）"
}

# 构建镜像
build_images() {
    log_info "开始构建 Docker 镜像..."
    make docker
    log_success "镜像构建完成"
}

# 导出镜像
export_images() {
    log_info "导出镜像到 ${LOCAL_TMP}/${IMAGE_FILE}..."
    docker save apps-server:latest apps-web:latest \
        -o "${LOCAL_TMP}/${IMAGE_FILE}"

    local size=$(du -h "${LOCAL_TMP}/${IMAGE_FILE}" | cut -f1)
    log_success "镜像导出完成，文件大小: ${size}"
}

# 上传镜像
upload_images() {
    log_info "上传镜像到 ${SERVER}:${REMOTE_TMP}..."
    scp "${LOCAL_TMP}/${IMAGE_FILE}" "${SERVER}:${REMOTE_TMP}/"
    log_success "镜像上传完成"
}

# 上传配置文件
upload_configs() {
    log_info "检查并上传配置文件..."

    # 检查远程目录是否存在
    ssh "$SERVER" "mkdir -p ${REMOTE_DIR}"

    # 检查 docker-compose.yml 是否存在，不存在则上传
    if ! ssh "$SERVER" "test -f ${REMOTE_DIR}/docker-compose.yml"; then
        log_info "上传 docker-compose.yml..."
        scp docker-compose.yml "${SERVER}:${REMOTE_DIR}/"
    else
        log_info "docker-compose.yml 已存在，跳过上传"
    fi

    # 检查 .env 是否存在，不存在则上传 .env.example
    if ! ssh "$SERVER" "test -f ${REMOTE_DIR}/.env"; then
        if [ -f ".env.example" ]; then
            log_info "上传 .env.example 为 .env..."
            scp .env.example "${SERVER}:${REMOTE_DIR}/.env"
        else
            log_warn ".env.example 不存在，请手动创建 .env 文件"
        fi
    else
        log_info ".env 已存在，跳过上传"
    fi

    log_success "配置文件检查完成"
}

# 服务器部署
deploy_on_server() {
    log_info "在服务器上部署..."

    ssh "$SERVER" bash << EOF
        set -e

        echo "[INFO] 加载 Docker 镜像..."
        docker load -i ${REMOTE_TMP}/${IMAGE_FILE}

        echo "[INFO] 清理临时文件..."
        rm -f ${REMOTE_TMP}/${IMAGE_FILE}

        echo "[INFO] 启动服务..."
        cd ${REMOTE_DIR}
        docker compose pull 2>/dev/null || true
        docker compose up -d

        echo "[INFO] 等待服务启动..."
        sleep 5

        echo "[INFO] 容器状态:"
        docker compose ps
EOF

    log_success "服务器部署完成"
}

# 执行数据库迁移
run_migration() {
    log_info "执行数据库迁移..."
    ssh "$SERVER" "docker exec apps-server npx drizzle-kit push"
    log_success "数据库迁移完成"
}

# 执行种子数据
run_seed() {
    log_info "执行种子数据..."
    ssh "$SERVER" "docker exec apps-server npx tsx src/seed.ts"
    log_success "种子数据执行完成"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    ssh "$SERVER" "cd ${REMOTE_DIR} && docker compose restart"
    log_success "服务重启完成"
}

# 查看日志
view_logs() {
    log_info "查看服务日志 (Ctrl+C 退出)..."
    ssh "$SERVER" "cd ${REMOTE_DIR} && docker compose logs -f --tail=100"
}

# 清理本地临时文件
cleanup_local() {
    if [ -f "${LOCAL_TMP}/${IMAGE_FILE}" ]; then
        log_info "清理本地临时文件..."
        rm -f "${LOCAL_TMP}/${IMAGE_FILE}"
        log_success "本地临时文件已清理"
    fi
}

# 完整部署流程
full_deploy() {
    local start_time=$(date +%s)

    log_info "========== 开始完整部署 =========="

    build_images
    export_images
    upload_images
    upload_configs
    deploy_on_server
    cleanup_local

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log_success "========== 部署完成 =========="
    log_info "总耗时: ${duration} 秒"
    log_info ""
    log_info "服务地址:"
    log_info "  前端: http://${SERVER}:8080"
    log_info "  后端: http://${SERVER}:4000"
    log_info ""
    log_info "如需执行数据库迁移，运行: $0 -d -m"
}

# 解析参数
DO_BUILD=false
DO_UPLOAD=false
DO_DEPLOY=false
DO_MIGRATE=false
DO_SEED=false
DO_RESTART=false
DO_LOGS=false
DO_FULL=true

while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--build-only)
            DO_BUILD=true
            DO_FULL=false
            shift
            ;;
        -u|--upload-only)
            DO_UPLOAD=true
            DO_FULL=false
            shift
            ;;
        -d|--deploy-only)
            DO_DEPLOY=true
            DO_FULL=false
            shift
            ;;
        -m|--migrate)
            DO_MIGRATE=true
            shift
            ;;
        -s|--seed)
            DO_SEED=true
            shift
            ;;
        -r|--restart)
            DO_RESTART=true
            DO_FULL=false
            shift
            ;;
        -l|--logs)
            DO_LOGS=true
            DO_FULL=false
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 执行操作
if $DO_FULL; then
    full_deploy
else
    if $DO_BUILD; then
        build_images
        export_images
    fi

    if $DO_UPLOAD; then
        if [ ! -f "${LOCAL_TMP}/${IMAGE_FILE}" ]; then
            log_error "镜像文件不存在: ${LOCAL_TMP}/${IMAGE_FILE}"
            log_info "请先运行 $0 -b 构建镜像"
            exit 1
        fi
        upload_images
        upload_configs
    fi

    if $DO_DEPLOY; then
        upload_configs
        deploy_on_server
    fi

    if $DO_RESTART; then
        restart_services
    fi

    if $DO_LOGS; then
        view_logs
    fi
fi

# 执行迁移和种子（如果指定）
if $DO_MIGRATE; then
    run_migration
fi

if $DO_SEED; then
    run_seed
fi

log_success "所有操作完成!"
