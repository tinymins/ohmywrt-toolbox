import { z } from "zod";

// ============================================
// 代理组定义
// ============================================

export const ProxyGroupSchema = z.object({
  name: z.string(),
  type: z.string(),
  proxies: z.array(z.string()),
  /** 这个组不加节点 */
  readonly: z.boolean().optional(),
});

export type ProxyGroup = z.infer<typeof ProxyGroupSchema>;

// ============================================
// 规则提供者
// ============================================

export const ProxyRuleProviderSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.string().optional(),
});

export type ProxyRuleProvider = z.infer<typeof ProxyRuleProviderSchema>;

export const ProxyRuleProvidersListSchema = z.record(
  z.string(),
  z.array(ProxyRuleProviderSchema),
);

export type ProxyRuleProvidersList = z.infer<
  typeof ProxyRuleProvidersListSchema
>;

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
  /** 订阅缓存时间（分钟），null 或 0 表示不缓存 */
  cacheTtlMinutes: z.number().nullable(),
  lastAccessAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProxySubscribe = z.infer<typeof ProxySubscribeSchema>;

// 用于 API 返回的完整订阅对象，包含用户信息
export const ProxySubscribeWithUserSchema = ProxySubscribeSchema.extend({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  authorizedUsers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  ),
});

export type ProxySubscribeWithUser = z.infer<
  typeof ProxySubscribeWithUserSchema
>;

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
  authorizedUserIds: z.array(z.string()).optional().default([]),
  cacheTtlMinutes: z.number().min(0).nullable().optional(),
});

export type CreateProxySubscribeInput = z.infer<
  typeof CreateProxySubscribeInputSchema
>;

export const UpdateProxySubscribeInputSchema = z.object({
  id: z.string(),
  remark: z.string().nullable().optional(),
  subscribeUrl: z.string().nullable().optional(),
  ruleList: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  filter: z.string().nullable().optional(),
  servers: z.string().nullable().optional(),
  customConfig: z.string().nullable().optional(),
  authorizedUserIds: z.array(z.string()).optional(),
  cacheTtlMinutes: z.number().min(0).nullable().optional(),
});

export type UpdateProxySubscribeInput = z.infer<
  typeof UpdateProxySubscribeInputSchema
>;

export const DeleteProxySubscribeInputSchema = z.object({
  id: z.string(),
});

export type DeleteProxySubscribeInput = z.infer<
  typeof DeleteProxySubscribeInputSchema
>;

// ============================================
// 规则测试
// ============================================

export const ProxyRuleTestInputSchema = z.object({
  url: z.string(),
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
  filteredBy: z.string().optional(),
});

export type ProxyPreviewNode = z.infer<typeof ProxyPreviewNodeSchema>;

export const ProxyPreviewInputSchema = z.object({
  id: z.string(),
});

export type ProxyPreviewInput = z.infer<typeof ProxyPreviewInputSchema>;

export const ProxyPreviewOutputSchema = z.object({
  nodes: z.array(ProxyPreviewNodeSchema),
});

export type ProxyPreviewOutput = z.infer<typeof ProxyPreviewOutputSchema>;

// ============================================
// 订阅调试（流式）
// ============================================

/** 调试目标格式 */
export const ProxyDebugFormatSchema = z.enum([
  "clash",
  "clash-meta",
  "sing-box",
  "sing-box-v12",
]);

export type ProxyDebugFormat = z.infer<typeof ProxyDebugFormatSchema>;

/** 调试输入 */
export const ProxyDebugInputSchema = z.object({
  id: z.string(),
  format: ProxyDebugFormatSchema,
});

export type ProxyDebugInput = z.infer<typeof ProxyDebugInputSchema>;

/** 被过滤的节点信息 */
export const ProxyDebugFilteredNodeSchema = z.object({
  node: ProxyPreviewNodeSchema,
  matchedRule: z.string(),
});

/** Step: 配置解析完成 */
export const ProxyDebugConfigStepSchema = z.object({
  type: z.literal("config"),
  data: z.object({
    subscribeUrls: z.array(z.string()),
    filters: z.array(z.string()),
    groups: z.array(ProxyGroupSchema),
    ruleProviders: ProxyRuleProvidersListSchema,
    customConfig: z.array(z.unknown()),
    servers: z.array(z.unknown()),
  }),
});

/** Step: 手动服务器解析完成 */
export const ProxyDebugManualServersStepSchema = z.object({
  type: z.literal("manual-servers"),
  data: z.object({
    count: z.number(),
    nodes: z.array(ProxyPreviewNodeSchema),
  }),
});

/** Step: 开始获取远程订阅源 */
export const ProxyDebugSourceStartStepSchema = z.object({
  type: z.literal("source-start"),
  data: z.object({
    sourceIndex: z.number(),
    url: z.string(),
  }),
});

/** Step: 远程订阅源获取完成 */
export const ProxyDebugSourceResultStepSchema = z.object({
  type: z.literal("source-result"),
  data: z.object({
    sourceIndex: z.number(),
    url: z.string(),
    httpStatus: z.number().nullable(),
    httpHeaders: z.record(z.string(), z.string()),
    rawText: z.string(),
    format: z.enum(["base64", "yaml", "unknown"]),
    parsedNodeCount: z.number(),
    nodesBeforeFilter: z.array(ProxyPreviewNodeSchema),
    nodesAfterFilter: z.array(ProxyPreviewNodeSchema),
    filteredNodes: z.array(ProxyDebugFilteredNodeSchema),
    error: z.string().nullable(),
    fetchDurationMs: z.number(),
    /** 是否命中缓存 */
    cached: z.boolean(),
  }),
});

/** Step: 节点合并完成 */
export const ProxyDebugMergeStepSchema = z.object({
  type: z.literal("merge"),
  data: z.object({
    totalNodesBeforeFilter: z.number(),
    totalNodesAfterFilter: z.number(),
    totalFiltered: z.number(),
    finalNodeNames: z.array(z.string()),
  }),
});

/** Step: 配置组装完成 */
export const ProxyDebugOutputStepSchema = z.object({
  type: z.literal("output"),
  data: z.object({
    proxyGroupCount: z.number(),
    ruleCount: z.number(),
    ruleProviderCount: z.number(),
    configOutput: z.string(),
  }),
});

/** Step: 全部完成 */
export const ProxyDebugDoneStepSchema = z.object({
  type: z.literal("done"),
  data: z.object({
    totalDurationMs: z.number(),
  }),
});

/** 调试步骤联合类型 */
export const ProxyDebugStepSchema = z.discriminatedUnion("type", [
  ProxyDebugConfigStepSchema,
  ProxyDebugManualServersStepSchema,
  ProxyDebugSourceStartStepSchema,
  ProxyDebugSourceResultStepSchema,
  ProxyDebugMergeStepSchema,
  ProxyDebugOutputStepSchema,
  ProxyDebugDoneStepSchema,
]);

export type ProxyDebugStep = z.infer<typeof ProxyDebugStepSchema>;

// ============================================
// 节点链路追踪
// ============================================

/** 节点追踪输入 */
export const ProxyNodeTraceInputSchema = z.object({
  /** 订阅 ID */
  id: z.string(),
  /** 输出格式 */
  format: ProxyDebugFormatSchema,
  /** 节点名称（appendIcon 后的名称） */
  nodeName: z.string(),
});

export type ProxyNodeTraceInput = z.infer<typeof ProxyNodeTraceInputSchema>;

/** 追踪步骤: 来源 */
export const ProxyNodeTraceSourceStepSchema = z.object({
  type: z.literal("source"),
  data: z.object({
    /** 来源索引（0=手动，1+=远程订阅源序号） */
    sourceIndex: z.number(),
    /** 来源地址 */
    sourceUrl: z.string(),
    /** 来源格式 */
    format: z.enum(["base64", "yaml", "manual"]),
    /** 原始代理配置数据（来自上游的原始数据） */
    rawData: z.record(z.string(), z.unknown()),
  }),
});

/** 追踪步骤: 解析为 Clash proxy */
export const ProxyNodeTraceParseStepSchema = z.object({
  type: z.literal("parse"),
  data: z.object({
    /** 解析后的 Clash proxy 对象 */
    clashProxy: z.record(z.string(), z.unknown()),
  }),
});

/** 追踪步骤: 过滤检查 */
export const ProxyNodeTraceFilterStepSchema = z.object({
  type: z.literal("filter"),
  data: z.object({
    /** 是否通过过滤 */
    passed: z.boolean(),
    /** 匹配到的过滤规则（被过滤时） */
    matchedRule: z.string().nullable(),
    /** 应用的所有过滤规则 */
    filtersApplied: z.array(z.string()),
  }),
});

/** 追踪步骤: 名称富化 */
export const ProxyNodeTraceEnrichStepSchema = z.object({
  type: z.literal("enrich"),
  data: z.object({
    /** 原始名称 */
    originalName: z.string(),
    /** 富化后名称（appendIcon 后） */
    enrichedName: z.string(),
  }),
});

/** 追踪步骤: 合并 */
export const ProxyNodeTraceMergeStepSchema = z.object({
  type: z.literal("merge"),
  data: z.object({
    /** 在最终列表中的位置（从 1 开始） */
    positionInFinalList: z.number(),
    /** 最终列表总节点数 */
    totalNodes: z.number(),
  }),
});

/** 追踪步骤: 分组分配 */
export const ProxyNodeTraceGroupAssignStepSchema = z.object({
  type: z.literal("group-assign"),
  data: z.object({
    /** 被分配到的分组列表 */
    assignedGroups: z.array(
      z.object({
        name: z.string(),
        type: z.string(),
      }),
    ),
  }),
});

/** 追踪步骤: 格式转换（仅 Sing-box） */
export const ProxyNodeTraceConvertStepSchema = z.object({
  type: z.literal("convert"),
  data: z.object({
    /** 转换后的 Sing-box outbound 对象 */
    singboxOutbound: z.record(z.string(), z.unknown()),
  }),
});

/** 追踪步骤: 最终输出 */
export const ProxyNodeTraceOutputStepSchema = z.object({
  type: z.literal("output"),
  data: z.object({
    /** 该节点在最终配置中的片段（YAML 或 JSON） */
    configFragment: z.string(),
  }),
});

/** 追踪步骤联合类型 */
export const ProxyNodeTraceStepSchema = z.discriminatedUnion("type", [
  ProxyNodeTraceSourceStepSchema,
  ProxyNodeTraceParseStepSchema,
  ProxyNodeTraceFilterStepSchema,
  ProxyNodeTraceEnrichStepSchema,
  ProxyNodeTraceMergeStepSchema,
  ProxyNodeTraceGroupAssignStepSchema,
  ProxyNodeTraceConvertStepSchema,
  ProxyNodeTraceOutputStepSchema,
]);

export type ProxyNodeTraceStep = z.infer<typeof ProxyNodeTraceStepSchema>;

/** 节点追踪输出 */
export const ProxyNodeTraceOutputSchema = z.object({
  /** 追踪的节点名称 */
  nodeName: z.string(),
  /** 追踪步骤列表 */
  steps: z.array(ProxyNodeTraceStepSchema),
});

export type ProxyNodeTraceOutput = z.infer<typeof ProxyNodeTraceOutputSchema>;
