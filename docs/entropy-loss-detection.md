# 节点数据丢失追踪（Entropy-Loss Detection）

代理节点在 Clash 格式转换为 Sing-box 格式时，由于两种格式的数据模型不同，部分字段可能在转换过程中被遗漏。Entropy-Loss Detection 系统追踪每个节点在转换全链路中的字段消费情况，标记出存在信息丢失的节点。

## 核心原理

### 问题场景

```
Clash 节点（源）                    Sing-box 节点（目标）
┌────────────────────┐              ┌────────────────────┐
│ name: "美国节点"    │              │ tag: "美国节点"     │
│ type: trojan       │   转换器      │ type: trojan       │
│ server: 1.2.3.4    │ ──────────▶  │ server: 1.2.3.4    │
│ port: 443          │              │ server_port: 443   │
│ password: abc      │              │ password: abc      │
│ sni: example.com   │              │ tls.server_name    │
│ smux:              │              │ multiplex:         │
│   enabled: true    │              │   enabled: true    │
│   protocol: h2mux  │              │   protocol: h2mux  │
│ custom-field: xxx  │  ← 未知字段   │                    │ ← 丢失！
└────────────────────┘              └────────────────────┘
```

`custom-field` 未被转换器处理，数据在转换中丢失。如果这个字段对节点功能至关重要，将导致下游客户端无法正常使用该节点。

### 检测算法

```
                    ┌─────────────────────────┐
                    │   ClashProxy.extra       │
                    │   所有非基础字段的 Map    │
                    │   ┌──────────────────┐   │
                    │   │ password         │   │
                    │   │ sni              │   │
                    │   │ smux             │   │
                    │   │ alpn             │   │
                    │   │ custom-field     │   │
                    │   └──────────────────┘   │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │ known_consumed_keys()    │
                    │ 该类型转换器能处理的字段   │
                    │ ┌──────────────────┐     │
                    │ │ password    ✓    │     │
                    │ │ sni         ✓    │     │
                    │ │ smux        ✓    │     │
                    │ │ alpn        ✓    │     │
                    │ └──────────────────┘     │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │      差集计算            │
                    │                         │
                    │  extra.keys()           │
                    │  - consumed_keys        │
                    │  = lost_fields          │
                    │                         │
                    │  → ["custom-field"]     │
                    └─────────────────────────┘
```

### 核心函数

```rust
/// 返回指定代理类型的转换器能处理的所有字段名
fn known_consumed_keys(proxy_type: &str) -> HashSet<&'static str>

/// 执行转换并返回 (转换结果, 丢失字段列表)
pub fn convert_clash_proxy_to_singbox_with_diff(
    proxy: &ClashProxy,
) -> (Option<Value>, Vec<String>)
```

**`convert_clash_proxy_to_singbox_with_diff` 实现逻辑：**

```rust
pub fn convert_clash_proxy_to_singbox_with_diff(
    proxy: &ClashProxy,
) -> (Option<Value>, Vec<String>) {
    let outbound = convert_clash_proxy_to_singbox(proxy);

    let lost = if outbound.is_none() {
        // 转换完全失败 → 所有字段都丢失
        proxy.extra.keys().cloned().collect()
    } else {
        // 计算未被消费的字段
        let consumed = known_consumed_keys(&proxy.proxy_type);
        proxy.extra.keys()
            .filter(|k| !consumed.contains(k.as_str()))
            .cloned()
            .collect()
    };

    (outbound, lost)
}
```

## `known_consumed_keys` 字段表

每种代理类型的转换器能处理的字段不同。以下是完整的字段清单：

### 公共字段（所有类型共享）

| 组 | 字段 |
|----|------|
| TLS | `tls`, `servername`, `sni`, `alpn`, `skip-cert-verify`, `client-fingerprint`, `reality-opts` |
| 传输层 | `network`, `http-opts`, `h2-opts`, `ws-opts`, `grpc-opts` |
| 多路复用 | `smux`, `multiplex` |
| 通用 | `udp` |

### 各类型特有字段

| 类型 | 特有字段 |
|------|---------|
| vmess | `uuid`, `cipher`, `alterId` |
| vless | `uuid`, `flow` |
| ss | `cipher`, `password`, `plugin`, `plugin-opts` |
| trojan | `password` |
| hysteria2 | `password`, `ports`, `mport`, `up`, `down` |
| hysteria | `auth-str`, `obfs`, `up`, `down`, `recv-window-conn`, `recv-window`, `ca`, `ca-str`, `disable-mtu-discovery` |
| tuic | `uuid`, `password`, `heartbeat-interval`, `congestion-controller`, `reduce-rtt`, `udp-relay-mode` |
| http | `username`, `password`, `headers` |
| socks5 | `username`, `password` |
| anytls | `password` |

## 典型误报案例及修复

### 案例 1：Clash `smux` vs Sing-box `multiplex`

**问题**：Clash Meta 使用 `smux` 作为多路复用配置的 key，标准 Clash 使用 `multiplex`。转换器最初只识别 `multiplex`，导致 `smux` 被报告为丢失。

**修复**：`build_multiplex()` 同时检查两个 key：
```rust
let mux = proxy.extra.get("smux")
    .or_else(|| proxy.extra.get("multiplex"));
```
并在 `known_consumed_keys` 中声明两个 key 均为已消费。

### 案例 2：Hysteria2 带宽字段

**问题**：Clash 使用 `up: "200 Mbps"`, `down: "1000 Mbps"`（字符串），Sing-box 使用 `up_mbps: 200`, `down_mbps: 1000`（整数）。转换器最初未处理这些字段。

**修复**：添加 `parse_mbps()` 辅助函数解析带宽字符串，并在转换器中映射到 Sing-box 的整数字段。

### 案例 3：Trojan 传输层支持

**问题**：Trojan 节点配置了 WebSocket 传输层（`ws-opts`），但转换器未调用 `build_transport()`。

**修复**：在 `convert_trojan()` 中添加 `build_transport()` 调用。

## 在调试工具中的展现

### 调试流（SSE）

调试流在 **merge** 事件中报告有数据丢失的节点列表：

```json
{
  "type": "merge",
  "data": {
    "totalNodesBeforeFilter": 120,
    "totalNodesAfterFilter": 101,
    "nodeWarnings": [
      "🇺🇸 美国 DC1 trojan",
      "🇭🇰 香港 hk-cn2 hysteria2"
    ]
  }
}
```

前端在节点统计处显示警告数量（黄色徽章），用户可以点击查看哪些节点受影响。

### 单节点追踪

追踪单个节点时，**convert** 步骤返回具体的丢失字段：

```json
{
  "type": "convert",
  "data": {
    "singboxOutbound": { ... },
    "lostFields": ["custom-field", "unknown-opts"]
  }
}
```

前端在转换步骤处标记黄色警告图标，用户可以看到具体丢了哪些字段。

### 追踪流程（8 步）

```
1. source    → 订阅源 URL、格式（base64/yaml/manual）
2. parse     → 原始 Clash 节点对象
3. filter    → 是否被过滤器排除
4. enrich    → 图标追加、前缀标准化
5. merge     → 在最终列表中的位置
6. group     → 被分配到哪些代理分组
7. convert   → Sing-box 转换结果 + 丢失字段 ← 熵损检测
8. output    → 最终输出格式的配置片段
```

## 设计原则

1. **白名单机制**：只有明确声明为"已消费"的字段才被认为是安全的。新增的未知字段默认被视为丢失，宁可误报也不漏报。

2. **非侵入性**：检测逻辑不影响实际转换——即使有字段被报告为丢失，转换结果仍然正常输出。

3. **格式条件性**：只在 Sing-box 格式下触发检测。Clash 格式是直通的，不存在转换丢失问题。

4. **分离关注点**：`convert_clash_proxy_to_singbox()` 负责转换，`known_consumed_keys()` 负责声明，`_with_diff()` 负责比对。三者独立维护。

## 维护指南

当添加新的代理类型支持或扩展现有转换器时：

1. **在转换函数中处理新字段**（如 `convert_trojan()` 中添加对新 Clash 字段的映射）
2. **在 `known_consumed_keys()` 中声明该字段**（否则会产生误报）
3. **使用调试工具验证**：检查所有订阅的 nodeWarnings 是否为空
