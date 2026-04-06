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
              ┌─────────────────┼─────────────────┐
              │                 │                  │
   ┌──────────▼──────────┐ ┌───▼──────────┐ ┌─────▼──────────┐
   │ known_consumed_keys  │ │ known_ignored │ │ 未命中任何集合  │
   │ 转换器能处理的字段    │ │ _keys()      │ │                │
   │ ✓ password           │ │ 有意忽略的字段 │ │ → lost_fields  │
   │ ✓ sni                │ │ ℹ smux (hy2) │ │ ⚠ custom-field │
   │ ✓ alpn               │ └──────────────┘ └────────────────┘
   └─────────────────────┘
```

字段分为三类：
- **consumed**（已消费）：转换器正确处理，不报告
- **ignored**（有意忽略）：目标格式不适用，蓝色信息提示（如 hysteria2 的 smux）
- **lost**（丢失）：未被处理的未知字段，琥珀色警告

### 核心函数

```rust
/// 返回指定代理类型的转换器能处理的所有字段名
fn known_consumed_keys(proxy_type: &str) -> HashSet<&'static str>

/// 返回指定代理类型中有意忽略的字段名（目标格式不适用）
fn known_ignored_keys(proxy_type: &str) -> HashSet<&'static str>

/// 执行转换并返回 (转换结果, 丢失字段列表, 有意忽略字段列表)
pub fn convert_clash_proxy_to_singbox_with_diff(
    proxy: &ClashProxy,
) -> (Option<Value>, Vec<String>, Vec<String>)
```

**`convert_clash_proxy_to_singbox_with_diff` 实现逻辑：**

```rust
pub fn convert_clash_proxy_to_singbox_with_diff(
    proxy: &ClashProxy,
) -> (Option<Value>, Vec<String>, Vec<String>) {
    let outbound = convert_clash_proxy_to_singbox(proxy);

    if outbound.is_none() {
        // 转换完全失败 → 所有字段都丢失
        return (None, proxy.extra.keys().cloned().collect(), Vec::new());
    }

    let consumed = known_consumed_keys(&proxy.proxy_type);
    let ignored_set = known_ignored_keys(&proxy.proxy_type);

    let mut lost = Vec::new();
    let mut ignored = Vec::new();
    for k in proxy.extra.keys() {
        if consumed.contains(k.as_str()) { continue; }
        if ignored_set.contains(k.as_str()) {
            ignored.push(k.clone());
        } else {
            lost.push(k.clone());
        }
    }

    (outbound, lost, ignored)
}
```

## `known_consumed_keys` 字段表

每种代理类型的转换器能处理的字段不同。以下是完整的字段清单：

### 公共字段（所有类型共享）

| 组 | 字段 |
|----|------|
| TLS | `tls`, `servername`, `sni`, `alpn`, `skip-cert-verify`, `client-fingerprint`, `reality-opts` |
| 传输层 | `network`, `http-opts`, `h2-opts`, `ws-opts`, `grpc-opts` |
| 多路复用 | `smux`, `multiplex`（仅 TCP 类协议：vmess/vless/trojan） |
| 通用 | `udp`, `tfo`, `mptcp` |

### 各类型特有字段

| 类型 | 已消费字段 |
|------|---------|
| vmess | `uuid`, `cipher`, `alterId` |
| vless | `uuid`, `flow` |
| ss | `cipher`, `password`, `plugin`, `plugin-opts` |
| trojan | `password` |
| hysteria2 | `password`, `ports`, `hop-interval`, `mport`, `up`, `down` |
| hysteria | `auth-str`, `obfs`, `up`, `down`, `recv-window-conn`, `recv-window`, `ca`, `ca-str`, `disable-mtu-discovery` |
| tuic | `uuid`, `password`, `heartbeat-interval`, `congestion-controller`, `reduce-rtt`, `udp-relay-mode` |
| http | `username`, `password`, `headers` |
| socks5 | `username`, `password` |
| anytls | `password` |

### 有意忽略字段（`known_ignored_keys`）

目标格式不适用的字段，不影响转换结果，以蓝色信息提示展示：

| 类型 | 忽略字段 | 原因 |
|------|---------|------|
| hysteria2 | `smux`, `multiplex` | QUIC 原生支持多路复用，sing-box 不接受该字段 |
| hysteria | `smux`, `multiplex` | 同上 |
| tuic | `smux`, `multiplex` | 同上 |

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

### 案例 3：Hysteria2 端口跳跃（Port Hopping）

**问题**：Clash 使用 `ports: "35000-39000"`（破折号分隔范围），Sing-box 使用 `server_ports: ["35000:39000"]`（冒号分隔、数组格式）。转换器最初输出 `hop_ports`（错误字段名）且未转换分隔符。

**修复**：
1. 字段名从 `hop_ports` 改为 `server_ports`（Sing-box 规范）
2. 端口范围分隔符从 `-` 转为 `:`（`ports.replace('-', ":")`）
3. 输出为 JSON 数组格式
4. `hop-interval` 添加到已消费字段列表

### 案例 4：Trojan 传输层支持

**问题**：Trojan 节点配置了 WebSocket 传输层（`ws-opts`），但转换器未调用 `build_transport()`。

**修复**：在 `convert_trojan()` 中添加 `build_transport()` 调用。

### 案例 5：TCP Fast Open / MPTCP（Dial Fields）

**问题**：Clash 使用 `tfo: true`（TCP Fast Open）和 `mptcp: true`（Multi-Path TCP），这是适用于所有 TCP 代理类型的通用字段。Sing-box 1.12 的 Dial Fields 支持 `tcp_fast_open` 和 `tcp_multi_path`，但转换器未处理这两个字段，导致全部节点报丢失警告。

**修复**：在 `convert_clash_proxy_to_singbox()` 中，在类型特定转换完成后统一应用 `tfo` → `tcp_fast_open` 和 `mptcp` → `tcp_multi_path` 映射。

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

追踪单个节点时，**convert** 步骤返回丢失字段和有意忽略字段：

```json
{
  "type": "convert",
  "data": {
    "singboxOutbound": { ... },
    "lostFields": ["custom-field", "unknown-opts"],
    "ignoredFields": ["smux"]
  }
}
```

前端在转换步骤处：
- **琥珀色警告**（⚠️）：展示 `lostFields`，表示真实数据丢失
- **蓝色信息提示**（ℹ️）：展示 `ignoredFields`，表示目标格式不适用的字段被有意忽略

### 追踪流程（8 步）

```
1. source    → 订阅源 URL、格式（base64/yaml/manual）
2. parse     → 原始 Clash 节点对象
3. filter    → 是否被过滤器排除
4. enrich    → 图标追加、前缀标准化
5. merge     → 在最终列表中的位置
6. group     → 被分配到哪些代理分组
7. convert   → Sing-box 转换结果 + 丢失字段 + 忽略字段 ← 熵损检测
8. output    → 最终输出格式的配置片段
```

## 设计原则

1. **白名单机制**：只有明确声明为"已消费"的字段才被认为是安全的。新增的未知字段默认被视为丢失，宁可误报也不漏报。

2. **三级分类**：字段分为 consumed（已消费）、ignored（有意忽略）、lost（丢失）三级。ignored 字段以蓝色信息提示呈现，避免用户误以为是数据丢失，同时也不完全静默。

3. **非侵入性**：检测逻辑不影响实际转换——即使有字段被报告为丢失或忽略，转换结果仍然正常输出。

4. **格式条件性**：只在 Sing-box 格式下触发检测。Clash 格式是直通的，不存在转换丢失问题。

5. **分离关注点**：`convert_clash_proxy_to_singbox()` 负责转换，`known_consumed_keys()` 负责声明已消费，`known_ignored_keys()` 负责声明有意忽略，`_with_diff()` 负责比对。四者独立维护。

## 维护指南

当添加新的代理类型支持或扩展现有转换器时：

1. **在转换函数中处理新字段**（如 `convert_trojan()` 中添加对新 Clash 字段的映射）
2. **在 `known_consumed_keys()` 中声明该字段**（否则会产生误报）
3. **若字段因目标格式限制不可转换**，在 `known_ignored_keys()` 中声明（如 QUIC 协议的 smux）
4. **使用调试工具验证**：检查所有订阅的 nodeWarnings 是否为空
