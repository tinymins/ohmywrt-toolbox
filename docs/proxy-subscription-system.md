# 代理订阅管理系统

OhMyWRT Toolbox 的核心业务功能：聚合多个代理源，转换为多种输出格式，通过公开 URL 分享。

## 整体流程

```
┌──────────────────────────────────────────────────────────────────┐
│                       用户配置                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐              │
│  │ 订阅源 URLs │  │ 手动节点JSONC │  │ 规则/分组   │              │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌────────────────────────────────────────────────────────┐      │
│  │               fetch_proxies() 引擎                      │      │
│  │  1. 解析手动节点 (JSONC)                                 │      │
│  │  2. 逐源获取 (HTTP + 缓存 + 重试)                       │      │
│  │  3. 解析 (base64 URI / YAML 自动检测)                    │      │
│  │  4. 前缀标准化 + 过滤                                    │      │
│  │  5. 图标追加                                             │      │
│  └────────────────────┬───────────────────────────────────┘      │
│                       │                                          │
│                       ▼                                          │
│  ┌────────────────────────────────────────────────────────┐      │
│  │              格式转换 + 配置构建                          │      │
│  │                                                        │      │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │      │
│  │  │ Clash YAML  │  │ Clash-Meta   │  │  Sing-box    │  │      │
│  │  │ (直接输出)   │  │  YAML(增强)  │  │ JSON(转换)   │  │      │
│  │  └─────────────┘  └──────────────┘  └──────────────┘  │      │
│  └────────────────────┬───────────────────────────────────┘      │
│                       │                                          │
│                       ▼                                          │
│  ┌────────────────────────────────────────────────────────┐      │
│  │           公开访问端点 + 访问日志                         │      │
│  │  GET /api/public/proxy/{uuid}/{format}                 │      │
│  └────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

## 数据模型

### ProxySubscribe（主实体）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| userId | UUID FK | 所有者 |
| url | String UNIQUE | 公开访问的 UUID 标识 |
| remark | String | 备注名 |
| subscribeItems | JSONB | 订阅源列表（URL + 逐源 UA 配置） |
| servers | Text | 手动节点（JSONC 格式） |
| ruleList | JSONB | 规则提供商列表（25 类） |
| group | JSONB | 代理分组配置（24 组） |
| filter | JSONB | 排除过滤器 |
| customConfig | Text | 额外 Clash 配置段 |
| dnsConfig | JSONB | Sing-box DNS 配置 |
| useSystem* | Boolean×5 | 是否使用系统默认配置 |
| authorizedUserIds | JSONB | 授权共管用户列表 |
| cacheTtlMinutes | Int | 缓存有效期（分钟） |
| cachedNodeCount | Int | 最近缓存的节点数 |

### ProxyAccessLog（访问日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| subscribeId | UUID FK | 关联订阅 |
| accessType | String | 访问格式 (clash/sing-box/...) |
| ip | String | 访问者 IP |
| userAgent | String | 客户端 UA |
| nodeCount | Int | 本次返回的节点数 |
| createdAt | DateTime | 访问时间 |

## 订阅源获取流程

```
fetch_and_parse(url, ua, ttl)
  │
  ├─ 1. 检查 TTL 缓存（url+ua 为 key）
  │     命中且未过期 → 直接返回 (cached: true)
  │
  ├─ 2. HTTP GET（最多 3 次重试）
  │     成功 + 节点数 > 0 → 写入缓存，返回
  │     成功 + 节点数 = 0 → 重试
  │     网络错误 → 重试
  │
  ├─ 3. 全部失败 → 检查兜底缓存（忽略 TTL）
  │     有兜底 → 返回过期缓存 (cached: true)
  │     无兜底 → 返回 None
  │
  └─ 缓存 Key: "{url}\0{ua}"（同一 URL 不同 UA 独立缓存）
```

**设计意图**：订阅源服务商经常临时不可用，兜底缓存确保不会因上游故障导致终端设备断网。

## 解析器（Parser）

自动检测两种格式：

### Base64 URI 格式
支持协议：`vless://`, `vmess://`, `ss://`, `trojan://`, `ssr://`, `hysteria://`, `hysteria2://`, `hy2://`, `anytls://`

每个 URI 解析为 `ClashProxy` 结构体，字段映射到 Clash 格式的等价表示。

### YAML 格式（Clash 配置）
直接反序列化 `proxies` 数组，每个节点的已知字段（name, type, server, port）提取为结构体字段，其余全部捕获到 `extra: Map<String, Value>` 中。

```rust
pub struct ClashProxy {
    pub name: String,
    pub proxy_type: String,  // vmess, vless, ss, trojan, ...
    pub server: String,
    pub port: u16,
    #[serde(flatten)]
    pub extra: serde_json::Map<String, Value>,  // 所有其他字段
}
```

> `#[serde(flatten)]` 是熵损检测的基础——它捕获了所有未知字段，使得后续可以追踪哪些被消费、哪些被遗漏。

## 格式转换器（Converter）

### 支持的代理类型

| 类型 | Clash → Sing-box 映射 |
|------|----------------------|
| VMess | uuid, security, alter_id, transport, tls, multiplex |
| VLESS | uuid, flow, transport, tls, multiplex |
| Shadowsocks | method, password, plugin, plugin_opts |
| Trojan | password, tls (强制启用), transport, multiplex |
| Hysteria2 | password, server_ports (端口跳跃), up_mbps, down_mbps |
| Hysteria | auth_str, obfs, bandwidth |
| TUIC | uuid, password, heartbeat, congestion_control |
| HTTP | username, password, tls |
| SOCKS5 | username, password, udp |
| AnyTLS | password, client-fingerprint |

### 公共构建器

- **`build_tls()`**：TLS 配置（servername, alpn, skip-cert-verify, uTLS fingerprint, REALITY）
- **`build_transport()`**：传输层（HTTP, WebSocket, HTTP/2, gRPC）
- **`build_multiplex()`**：多路复用（Clash 的 `smux`/`multiplex` → Sing-box 的 `multiplex`）

## 配置校验（Validator）

调试流程中最终配置输出后、完成前的校验步骤，验证转换器生成的配置文件是否合法可用。

### 校验策略

| 格式 | 校验方式 | 工具 |
|------|----------|------|
| sing-box | 二进制校验 `sing-box check -c` | sing-box v1.11.x |
| sing-box-v12 | 二进制校验（v1.12+） | sing-box v1.12.x+ |
| clash / clash-meta | YAML 语法 + 必需字段检查 | Rust serde_yaml |

- **sing-box 格式**：将配置写入临时文件，调用 `sing-box check -c /tmp/file.json` 验证
- **Clash 格式**：解析 YAML 语法 + 检查 `proxies`/`proxy-groups`/`rules` 字段是否存在
- 未安装二进制时返回 `skipped`，不阻断调试流程

### 安全隔离（纵深防御）

```bash
timeout 5s unshare --user --net -- sing-box check -c /tmp/validate_xxx.json
```

| 措施 | 防范 |
|------|------|
| `unshare --user --net` | 用户+网络命名空间隔离，无需 CAP_SYS_ADMIN，即使 RCE 也无法发起网络连接 |
| `timeout 5s` | 防止挂死、死循环 |
| 临时文件 RAII | 用后即删，无法读写业务数据 |
| Docker 容器边界 | 生产环境隔离，DB 在另一个容器 |
| 自定义 seccomp profile | `docker/seccomp.json` 仅放行 `unshare` syscall，其余保持 Docker 默认限制 |
| 版本锁定 | `scripts/download-vendors.sh` 固定版本号 |

#### Docker 沙箱原理

Docker 默认的 seccomp profile 禁止 `unshare` syscall，导致无法在容器内创建命名空间。解决方案：

1. **自定义 seccomp profile**（`docker/seccomp.json`）：在 Docker 默认策略基础上仅额外放行 `unshare` syscall
2. **用户命名空间**（`--user`）：通过 `unshare --user --net` 先创建用户命名空间，再在其中创建网络命名空间，不需要 `CAP_SYS_ADMIN`
3. **compose 配置**：`security_opt: - seccomp=seccomp.json` 引用自定义 profile

降级逻辑（优先级从高到低）：
1. `unshare --user --net`（无特权，需 seccomp 放行 unshare）
2. `unshare --net`（需 CAP_SYS_ADMIN）
3. 直接执行（仅当 `ALLOW_INSECURE_VALIDATION=true`，**生产环境禁止**）

如果 `unshare` 不可用（权限不足），行为由 `ALLOW_INSECURE_VALIDATION` 环境变量控制：

| 环境 | 值 | 行为 |
|------|------|------|
| 开发 | `true` | 降级为 `timeout 5s sing-box check`（无网络隔离） |
| 生产 | `false` | 跳过校验并返回提示，**不执行**不受沙箱保护的二进制 |

sing-box 输出的 ANSI 颜色转义码会在返回前端前自动清除。

### 二进制管理

所有校验用的代理软件二进制由 `scripts/download-vendors.sh` 统一管理：

| 目录 | 工具 | 用途 |
|------|------|------|
| `DATA_LOCAL_PATH/vendors/sing-box-v11/` | sing-box v1.11.0 | sing-box 格式校验 |
| `DATA_LOCAL_PATH/vendors/sing-box-v12/` | sing-box v1.12.25 | sing-box-v12 格式校验 |
| `DATA_LOCAL_PATH/vendors/mihomo/` | mihomo v1.19.22 | clash/clash-meta 格式（预留） |

- 脚本通过 `.version` 标记文件实现幂等（已存在且版本匹配则跳过下载）
- 开发环境：`pnpm install` 时自动运行（postinstall hook，best-effort）
- Docker 环境：容器启动时由 `docker-entrypoint.sh` 调用（volume mount 会覆盖构建时下载的文件）
- 二进制发现优先级：环境变量覆盖 → vendor 目录 → PATH

### SSE 事件格式

```json
// 校验通过
{ "type": "validate", "data": { "valid": true, "method": "sing-box-binary" } }
// 校验失败（红色警告）
{ "type": "validate", "data": { "valid": false, "method": "sing-box-binary", "errors": ["..."] } }
// 跳过（二进制未安装）
{ "type": "validate", "data": { "skipped": true, "reason": "sing-box binary not found" } }
```

### 实现文件

- `packages/server/src/handlers/proxy/validator.rs` — 校验器核心逻辑
- `packages/web/src/components/dashboard/proxy/ProxyDebugModal/DebugStepContent.tsx` — 前端渲染

## 输出格式

### Clash / Clash-Meta（YAML）
直接输出 Clash 格式节点 + 代理分组 + 规则提供商 + DNS 配置。Clash-Meta 额外支持 Meta 特性。

### Sing-box v11 / v12（JSON）
完整的 Sing-box 配置，包含：
- **outbounds**：转换后的代理节点 + 分组选择器
- **route.rule_set**：远程规则集（指向 PUBLIC_SERVER_URL 的转换端点）
- **dns**：FakeIP + 分流 DNS
- **inbounds**：direct, tproxy (可选)
- **experimental**：Clash API (可选)

v12 与 v11 的主要差异在 DNS 配置结构和规则集引用方式。

### Clash YAML 规则 → Sing-box JSON 转换

Sing-box 的 `rule_set` 不能直接读取 Clash YAML 格式的规则文件，因此 Sing-box 配置中的每个远程规则集 URL 指向本服务器的转换端点，由服务器实时拉取原始 YAML、解析后返回 Sing-box JSON source 格式。

**转换流程**：
1. Sing-box 客户端请求 `/api/proxy/sing-box/convert/rule?url=<原始YAML地址>`
2. 服务器拉取原始 Clash YAML 规则文件
3. 解析 `payload` 中的条目（DOMAIN、DOMAIN-SUFFIX、IP-CIDR 等）
4. 转换为 Sing-box JSON source 格式返回

**支持的 Clash 规则类型映射**：

| Clash 类型 | Sing-box 字段 |
|-----------|--------------|
| DOMAIN / HOST / + | domain |
| DOMAIN-SUFFIX / HOST-SUFFIX | domain_suffix |
| DOMAIN-KEYWORD / HOST-KEYWORD | domain_keyword |
| DOMAIN-REGEX | domain_regex |
| IP-CIDR / IP-CIDR6 | ip_cidr |
| SRC-IP-CIDR | source_ip_cidr |
| DST-PORT | port |
| SRC-PORT | source_port |
| PROCESS-NAME | process_name |
| PROCESS-PATH | process_path |

**版本差异**：v11 输出 `version: 1`，v12 输出 `version: 3`。

## API 端点

### 认证端点（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/proxy/subscribes | 列出所有订阅 |
| POST | /api/proxy/subscribes | 创建订阅 |
| GET | /api/proxy/subscribes/{id} | 获取单个 |
| PATCH | /api/proxy/subscribes/{id} | 更新订阅 |
| DELETE | /api/proxy/subscribes/{id} | 删除订阅 |
| GET | /api/proxy/subscribes/{id}/stats | 访问统计 |
| GET | /api/proxy/subscribes/{id}/preview-nodes | 节点预览 |
| GET | /api/proxy/subscribes/{id}/trace-node | 单节点追踪 |
| POST | /api/proxy/debug | 调试流（SSE） |
| POST | /api/proxy/test-source | 测试订阅源 |
| POST | /api/proxy/clear-cache | 清除缓存 |
| GET | /api/proxy/defaults | 系统默认配置 |
| GET | /api/proxy/user-stats | 用户统计 |

### 公开端点（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/public/proxy/{uuid}/clash | Clash YAML |
| GET | /api/public/proxy/{uuid}/clash-meta | Clash-Meta YAML |
| GET | /api/public/proxy/{uuid}/sing-box | Sing-box v11 JSON |
| GET | /api/public/proxy/{uuid}/sing-box/12 | Sing-box v12 JSON |
| GET | /api/proxy/sing-box/convert/rule?url= | Clash YAML 规则 → Sing-box JSON (v11) |
| GET | /api/proxy/sing-box/convert/rule/12?url= | Clash YAML 规则 → Sing-box JSON (v12) |

## 缓存策略

- **存储**：进程内存 HashMap（进程生命周期）
- **Key**：`"{url}\0{ua}"` — 相同 URL 不同 UA 独立缓存
- **TTL**：每个订阅可配置（`cacheTtlMinutes`）
- **兜底**：TTL 过期后仍保留最后一次成功数据，在获取失败时作为降级返回

## 系统默认配置

### 规则提供商（25 类）
Apple, Microsoft, Google, YouTube, TikTok, Netflix, Steam, Discord, Telegram, ChatGPT, AI, GitHub, Reddit, Crypto, Adobe, 广告拦截 等。

### 代理分组（24 组）
🔰 国外流量, 🏳️‍🌈 Google, ✈️ Telegram, 🎬 YouTube/TikTok/Netflix, 🎮 Steam/Discord, 🤖 ChatGPT/AI, 🐙 GitHub, 🪙 Crypto 等。

### 默认过滤器
排除包含"官网""客服""qq群"的节点名称。

## 前端组件

| 组件 | 职责 |
|------|------|
| ProxySubscribeList | 订阅列表（表格 + CRUD） |
| ProxySubscribeModal | 创建/编辑订阅表单 |
| ProxyPreviewModal | 节点预览表格 |
| ProxyDebugModal | 实时调试（SSE 流） |
| ProxyStatsModal | 访问统计 |
| ProxyLinksModal | 公开链接展示 |
| SubscribeItemsEditor | 订阅源 URL + UA 编辑器 |
| DnsConfigEditor | DNS 配置编辑器 |
