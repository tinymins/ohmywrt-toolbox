import {
  createQuery,
  createMutation,
  createStreamMutation,
} from "@/lib/rust-api-runtime";

// ─── Types ───

export interface UserBrief {
  id: string;
  name: string;
  email: string;
}

export interface ProxySubscribe {
  id: string;
  userId: string;
  url: string;
  remark: string | null;
  subscribeUrl: string | null;
  subscribeItems: unknown[] | null;
  ruleList: string | null;
  useSystemRuleList: boolean;
  group: string | null;
  useSystemGroup: boolean;
  filter: string | null;
  useSystemFilter: boolean;
  servers: string | null;
  customConfig: string | null;
  useSystemCustomConfig: boolean;
  dnsConfig: string | null;
  useSystemDnsConfig: boolean;
  authorizedUserIds: string[];
  cacheTtlMinutes: number | null;
  cachedNodeCount: number;
  totalAccessCount: number;
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: UserBrief;
  authorizedUsers: UserBrief[];
}

export interface CreateProxySubscribeInput {
  remark?: string | null;
  subscribeUrl?: string | null;
  subscribeItems?: unknown[] | null;
  ruleList?: string | null;
  useSystemRuleList?: boolean;
  group?: string | null;
  useSystemGroup?: boolean;
  filter?: string | null;
  useSystemFilter?: boolean;
  servers?: string | null;
  customConfig?: string | null;
  useSystemCustomConfig?: boolean;
  dnsConfig?: string | null;
  useSystemDnsConfig?: boolean;
  authorizedUserIds?: string[] | null;
  cacheTtlMinutes?: number | null;
}

export interface UpdateProxySubscribeInput
  extends Partial<CreateProxySubscribeInput> {
  id: string;
}

export interface ProxyDefaults {
  ruleList: string;
  group: string;
  filter: string;
  customConfig: string;
  dnsConfig: string;
}

export interface ProxyAccessLog {
  id: string;
  subscribeId: string;
  accessType: string;
  ip: string | null;
  userAgent: string | null;
  nodeCount: number | null;
  createdAt: string;
}

export interface AccessByType {
  accessType: string;
  count: number;
}

export interface ProxyStats {
  totalAccesses: number;
  todayAccess: number;
  cachedNodeCount: number;
  lastAccessAt: string | null;
  accessByType: AccessByType[];
  recentAccessTotal: number;
  recentAccesses: ProxyAccessLog[];
}

export interface ProxyUserStats {
  totalSubscriptions: number;
  totalNodes: number;
  todayRequests: number;
}

// ─── API ───

export const proxyApi = {
  list: createQuery<void, ProxySubscribe[]>({
    path: "/api/proxy/subscribes",
  }),
  getById: createQuery<{ id: string }, ProxySubscribe>({
    path: "/api/proxy/subscribes",
    pathFn: (input) =>
      `/api/proxy/subscribes/${encodeURIComponent(input.id)}`,
  }),
  create: createMutation<CreateProxySubscribeInput, ProxySubscribe>({
    path: "/api/proxy/subscribes",
  }),
  update: createMutation<UpdateProxySubscribeInput, ProxySubscribe>({
    method: "PATCH",
    path: "/api/proxy/subscribes",
    pathFn: (input) =>
      `/api/proxy/subscribes/${encodeURIComponent(input.id)}`,
    bodyFn: (input) => {
      const { id: _, ...body } = input;
      return body;
    },
  }),
  delete: createMutation<{ id: string }, { id: string }>({
    method: "DELETE",
    path: "/api/proxy/subscribes",
    pathFn: (input) =>
      `/api/proxy/subscribes/${encodeURIComponent(input.id)}`,
  }),
  getStats: createQuery<{ id: string }, ProxyStats>({
    path: "/api/proxy/subscribes",
    pathFn: (input) =>
      `/api/proxy/subscribes/${encodeURIComponent(input.id)}/stats`,
  }),
  getDefaults: createQuery<void, ProxyDefaults>({
    path: "/api/proxy/defaults",
  }),
  getUserStats: createQuery<void, ProxyUserStats>({
    path: "/api/proxy/user-stats",
  }),
  previewNodes: createQuery<
    { id: string; format: string },
    { nodes: unknown[]; rawText?: string }
  >({
    path: "/api/proxy/preview-nodes",
    pathFn: (input) =>
      `/api/proxy/subscribes/${encodeURIComponent(input.id)}/preview-nodes`,
    paramsFn: (input) => ({ format: input.format }),
  }),
  traceNode: createQuery<
    { id: string; format: string; nodeName: string },
    { steps: unknown[] }
  >({
    path: "/api/proxy/trace-node",
    pathFn: (input) =>
      `/api/proxy/subscribes/${encodeURIComponent(input.id)}/trace-node`,
    paramsFn: (input) => ({
      format: input.format,
      nodeName: input.nodeName,
    }),
  }),
  debugSubscription: createStreamMutation<
    { id: string; format: string },
    unknown
  >({
    path: "/api/proxy/debug",
  }),
  clearCache: createMutation<void, { cleared: boolean }>({
    method: "POST",
    path: "/api/proxy/clear-cache",
  }),
  testSource: createMutation<
    { url: string; ua: string },
    {
      status: number;
      ua: string;
      nodeCount: number;
      nodes: { name: string; proxyType: string }[];
      elapsedMs: number;
      bodyBytes: number;
    }
  >({
    path: "/api/proxy/test-source",
  }),
};
