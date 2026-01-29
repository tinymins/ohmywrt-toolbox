import { z } from "zod";

// ============================================
// 代理组定义
// ============================================

export const ProxyGroupSchema = z.object({
  name: z.string(),
  type: z.string(),
  proxies: z.array(z.string()),
  /** 这个组不加节点 */
  readonly: z.boolean().optional()
});

export type ProxyGroup = z.infer<typeof ProxyGroupSchema>;

// ============================================
// 规则提供者
// ============================================

export const ProxyRuleProviderSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.string().optional()
});

export type ProxyRuleProvider = z.infer<typeof ProxyRuleProviderSchema>;

export const ProxyRuleProvidersListSchema = z.record(
  z.string(),
  z.array(ProxyRuleProviderSchema)
);

export type ProxyRuleProvidersList = z.infer<typeof ProxyRuleProvidersListSchema>;

// ============================================
// 代理订阅
// ============================================

export const ProxySubscribeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  url: z.string(),
  remark: z.string().nullable(),
  // JSONC 字符串（前端编辑器直接显示）
  subscribeUrl: z.string().nullable(),
  ruleList: z.string().nullable(),
  group: z.string().nullable(),
  filter: z.string().nullable(),
  servers: z.string().nullable(),
  customConfig: z.string().nullable(),
  authorizedUserIds: z.array(z.string()),
  lastAccessAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type ProxySubscribe = z.infer<typeof ProxySubscribeSchema>;

// 用于 API 返回的完整订阅对象，包含用户信息
export const ProxySubscribeWithUserSchema = ProxySubscribeSchema.extend({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string()
  }),
  authorizedUsers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string()
    })
  )
});

export type ProxySubscribeWithUser = z.infer<typeof ProxySubscribeWithUserSchema>;

// ============================================
// 创建/更新订阅输入（JSONC 字符串）
// ============================================

export const CreateProxySubscribeInputSchema = z.object({
  remark: z.string().nullable().optional(),
  subscribeUrl: z.string().nullable().optional(),
  ruleList: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  filter: z.string().nullable().optional(),
  servers: z.string().nullable().optional(),
  customConfig: z.string().nullable().optional(),
  authorizedUserIds: z.array(z.string()).optional().default([])
});

export type CreateProxySubscribeInput = z.infer<typeof CreateProxySubscribeInputSchema>;

export const UpdateProxySubscribeInputSchema = z.object({
  id: z.string(),
  remark: z.string().nullable().optional(),
  subscribeUrl: z.string().nullable().optional(),
  ruleList: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  filter: z.string().nullable().optional(),
  servers: z.string().nullable().optional(),
  customConfig: z.string().nullable().optional(),
  authorizedUserIds: z.array(z.string()).optional()
});

export type UpdateProxySubscribeInput = z.infer<typeof UpdateProxySubscribeInputSchema>;

export const DeleteProxySubscribeInputSchema = z.object({
  id: z.string()
});

export type DeleteProxySubscribeInput = z.infer<typeof DeleteProxySubscribeInputSchema>;

// ============================================
// 规则测试
// ============================================

export const ProxyRuleTestInputSchema = z.object({
  url: z.string()
});

export type ProxyRuleTestInput = z.infer<typeof ProxyRuleTestInputSchema>;

// ============================================
// 节点预览
// ============================================

/** 预览节点的基本信息 */
export const ProxyPreviewNodeSchema = z.object({
  /** 节点名称 */
  name: z.string(),
  /** 代理协议类型 (vmess, vless, ss, trojan, hysteria2 等) */
  type: z.string(),
  /** 服务器地址 */
  server: z.string(),
  /** 端口 */
  port: z.number(),
  /** 来源索引（订阅源的序号，从 1 开始） */
  sourceIndex: z.number(),
  /** 来源地址（订阅 URL） */
  sourceUrl: z.string(),
  /** 完整的代理配置（用于展示详细信息） */
  raw: z.record(z.string(), z.unknown()),
  /** 是否被过滤规则过滤 */
  filtered: z.boolean().optional(),
  /** 匹配的过滤规则 */
  filteredBy: z.string().optional()
});

export type ProxyPreviewNode = z.infer<typeof ProxyPreviewNodeSchema>;

export const ProxyPreviewInputSchema = z.object({
  id: z.string()
});

export type ProxyPreviewInput = z.infer<typeof ProxyPreviewInputSchema>;

export const ProxyPreviewOutputSchema = z.object({
  nodes: z.array(ProxyPreviewNodeSchema)
});

export type ProxyPreviewOutput = z.infer<typeof ProxyPreviewOutputSchema>;
