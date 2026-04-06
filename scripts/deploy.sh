#!/bin/bash

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
        scp docker/docker-compose.yml "${SERVER}:${REMOTE_DIR}/"
    else
        log_info "docker/docker-compose.yml 已存在，跳过上传"
    fi

    # 上传 docker/docker-compose.debug.yml（叠加文件，始终更新）
    if [ -f "docker/docker-compose.debug.yml" ]; then
        scp docker/docker-compose.debug.yml "${SERVER}:${REMOTE_DIR}/"
    fi

    # 检查 .env 是否存在，不存在则上传 docker/.env.example
    if ! ssh "$SERVER" "test -f ${REMOTE_DIR}/.env"; then
        if [ -f "docker/.env.example" ]; then
            log_info "上传 docker/.env.example 为 .env..."
            scp docker/.env.example "${SERVER}:${REMOTE_DIR}/.env"
        else
            log_warn ".env.example 不存在，请手动创建 .env 文件"
        fi
    else
        log_info ".env 已存在，跳过上传"
    fi

    # 同步端口配置到服务器 .env
    log_info "同步端口配置: WEB_PORT=${PORT}"
    ssh "$SERVER" "sed -i 's/^WEB_PORT=.*/WEB_PORT=${PORT}/' ${REMOTE_DIR}/.env || echo 'WEB_PORT=${PORT}' >> ${REMOTE_DIR}/.env"

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
    log_info "执行数据库迁移（Prisma）..."

    ssh "$SERVER" "cd ${REMOTE_DIR} && docker compose exec server npx prisma db push"
    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        log_error "数据库迁移失败（退出码: $exit_code）"
        return 1
    else
        log_success "数据库迁移完成"
    fi
}

# 检查服务器 .env 是否缺少新变量
check_server_env_updates() {
    local app_env_example="${PROJECT_ROOT}/docker/.env.example"

    if [ ! -f "$app_env_example" ]; then
        return
    fi

    # 检查服务器上是否有 .env
    if ! ssh "$SERVER" "test -f ${REMOTE_DIR}/.env" 2>/dev/null; then
        return
    fi

    log_info "检查服务器 .env 配置..."

    # 获取本地 .env.example 的变量名
    local example_vars=$(grep -E '^[A-Z_]+=' "$app_env_example" | cut -d'=' -f1 | sort)

    # 获取服务器 .env 的变量名
    local server_vars=$(ssh "$SERVER" "grep -E '^[A-Z_]+=' ${REMOTE_DIR}/.env 2>/dev/null | cut -d'=' -f1 | sort")

    # 找出缺失的变量
    local missing_vars=$(comm -23 <(echo "$example_vars") <(echo "$server_vars"))

    if [ -n "$missing_vars" ]; then
        log_warn "服务器 .env 配置可能需要更新！"
        log_warn "以下变量在 .env.example 中存在但服务器 .env 中缺失:"
        for var in $missing_vars; do
            local default_value=$(grep "^${var}=" "$app_env_example" | cut -d'=' -f2-)
            log_warn "  ${var}=${default_value}"
        done
        log_info ""
        log_info "请登录服务器更新 ${REMOTE_DIR}/.env"
        log_info ""
    else
        log_success "服务器 .env 配置已是最新"
    fi
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

