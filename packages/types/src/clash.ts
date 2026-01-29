import { z } from "zod";

// ============================================
// Clash 代理组定义
// ============================================

export const ClashGroupSchema = z.object({
  name: z.string(),
  type: z.string(),
  proxies: z.array(z.string()),
  /** 这个组不加节点 */
  readonly: z.boolean().optional()
});

export type ClashGroup = z.infer<typeof ClashGroupSchema>;

// ============================================
// Clash 规则提供者
// ============================================

export const ClashRuleProviderSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.string().optional()
});

export type ClashRuleProvider = z.infer<typeof ClashRuleProviderSchema>;

export const ClashRuleProvidersListSchema = z.record(
  z.string(),
  z.array(ClashRuleProviderSchema)
);

export type ClashRuleProvidersList = z.infer<typeof ClashRuleProvidersListSchema>;

// ============================================
// Clash 订阅
// ============================================

export const ClashSubscribeSchema = z.object({
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

export type ClashSubscribe = z.infer<typeof ClashSubscribeSchema>;

// 用于 API 返回的完整订阅对象，包含用户信息
export const ClashSubscribeWithUserSchema = ClashSubscribeSchema.extend({
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

export type ClashSubscribeWithUser = z.infer<typeof ClashSubscribeWithUserSchema>;

// ============================================
// 创建/更新订阅输入（JSONC 字符串）
// ============================================

export const CreateClashSubscribeInputSchema = z.object({
  remark: z.string().nullable().optional(),
  subscribeUrl: z.string().nullable().optional(),
  ruleList: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  filter: z.string().nullable().optional(),
  servers: z.string().nullable().optional(),
  customConfig: z.string().nullable().optional(),
  authorizedUserIds: z.array(z.string()).optional().default([])
});

export type CreateClashSubscribeInput = z.infer<typeof CreateClashSubscribeInputSchema>;

export const UpdateClashSubscribeInputSchema = z.object({
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

export type UpdateClashSubscribeInput = z.infer<typeof UpdateClashSubscribeInputSchema>;

export const DeleteClashSubscribeInputSchema = z.object({
  id: z.string()
});

export type DeleteClashSubscribeInput = z.infer<typeof DeleteClashSubscribeInputSchema>;

// ============================================
// 规则测试
// ============================================

export const ClashRuleTestInputSchema = z.object({
  url: z.string()
});

export type ClashRuleTestInput = z.infer<typeof ClashRuleTestInputSchema>;

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
