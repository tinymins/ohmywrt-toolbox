import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { Modal, Table, Tooltip, Tag, Typography, Spin, Empty, Descriptions, Card } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { trpc } from "../../../lib/trpc";

const { Text } = Typography;

// 检测是否为移动设备
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

export interface ProxyPreviewModalRef {
  open: (subscribeId: string, remark?: string | null) => void;
}

interface ProxyNode {
  name: string;
  type: string;
  server: string;
  port: number;
  sourceIndex: number;
  sourceUrl: string;
  raw: Record<string, unknown>;
  filtered?: boolean;
  filteredBy?: string;
}

/** 协议类型对应的颜色 */
const typeColorMap: Record<string, string> = {
  vmess: "blue",
  vless: "purple",
  ss: "green",
  trojan: "orange",
  hysteria2: "magenta",
  hysteria: "red",
  tuic: "cyan",
  socks5: "default",
  http: "default"
};

/** 不同协议的关键字段配置 */
const protocolFields: Record<string, { key: string; label: string; sensitive?: boolean }[]> = {
  vmess: [
    { key: "uuid", label: "UUID", sensitive: true },
    { key: "alterId", label: "Alter ID" },
    { key: "cipher", label: "加密方式" },
    { key: "network", label: "传输协议" },
    { key: "tls", label: "TLS" },
    { key: "servername", label: "SNI" },
    { key: "ws-opts", label: "WebSocket 配置" },
    { key: "grpc-opts", label: "gRPC 配置" }
  ],
  vless: [
    { key: "uuid", label: "UUID", sensitive: true },
    { key: "flow", label: "Flow" },
    { key: "network", label: "传输协议" },
    { key: "tls", label: "TLS" },
    { key: "sni", label: "SNI" },
    { key: "client-fingerprint", label: "指纹" },
    { key: "reality-opts", label: "Reality 配置" },
    { key: "ws-opts", label: "WebSocket 配置" },
    { key: "grpc-opts", label: "gRPC 配置" }
  ],
  ss: [
    { key: "cipher", label: "加密方式" },
    { key: "password", label: "密码", sensitive: true },
    { key: "plugin", label: "插件" },
    { key: "plugin-opts", label: "插件配置" },
    { key: "udp", label: "UDP" }
  ],
  trojan: [
    { key: "password", label: "密码", sensitive: true },
    { key: "sni", label: "SNI" },
    { key: "alpn", label: "ALPN" },
    { key: "skip-cert-verify", label: "跳过证书验证" },
    { key: "client-fingerprint", label: "指纹" },
    { key: "network", label: "传输协议" },
    { key: "ws-opts", label: "WebSocket 配置" },
    { key: "grpc-opts", label: "gRPC 配置" }
  ],
  hysteria2: [
    { key: "password", label: "密码", sensitive: true },
    { key: "sni", label: "SNI" },
    { key: "obfs", label: "混淆类型" },
    { key: "obfs-password", label: "混淆密码", sensitive: true },
    { key: "alpn", label: "ALPN" },
    { key: "skip-cert-verify", label: "跳过证书验证" }
  ],
  hysteria: [
    { key: "auth-str", label: "认证字符串", sensitive: true },
    { key: "obfs", label: "混淆" },
    { key: "protocol", label: "协议" },
    { key: "up", label: "上行带宽" },
    { key: "down", label: "下行带宽" },
    { key: "sni", label: "SNI" },
    { key: "alpn", label: "ALPN" }
  ],
  tuic: [
    { key: "uuid", label: "UUID", sensitive: true },
    { key: "password", label: "密码", sensitive: true },
    { key: "congestion-controller", label: "拥塞控制" },
    { key: "udp-relay-mode", label: "UDP 中继模式" },
    { key: "sni", label: "SNI" },
    { key: "alpn", label: "ALPN" },
    { key: "reduce-rtt", label: "减少 RTT" }
  ]
};

/** 格式化值显示 */
const formatValue = (value: unknown, yesText = "Yes", noText = "No"): string => {
  if (value === undefined || value === null) return "-";
  if (typeof value === "boolean") return value ? yesText : noText;
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

/** 渲染展开行内容 */
const ExpandedRow = ({ record, noDetailText, clickToCopyText, yesText, noText }: { record: ProxyNode; noDetailText: string; clickToCopyText: string; yesText: string; noText: string }) => {
  const fields = protocolFields[record.type] || [];
  const raw = record.raw || {};

  // 获取该协议定义的字段
  const definedKeys = fields.map((f) => f.key);
  // 获取 raw 中存在但未在 fields 中定义的字段（排除基本字段）
  const basicKeys = ["name", "type", "server", "port"];
  const extraKeys = Object.keys(raw).filter(
    (k) => !definedKeys.includes(k) && !basicKeys.includes(k)
  );

  if (fields.length === 0 && extraKeys.length === 0) {
    return (
      <div className="px-4 py-2 text-gray-500">
        <Text type="secondary">{noDetailText}</Text>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800">
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 2, md: 3, lg: 4 }}
        bordered
        labelStyle={{ fontWeight: 500, width: 140 }}
      >
        {fields.map((field) => {
          const value = raw[field.key];
          if (value === undefined) return null;
          return (
            <Descriptions.Item key={field.key} label={field.label}>
              {field.sensitive ? (
                <Text copyable={{ text: formatValue(value, yesText, noText) }} className="font-mono text-xs">
                  <Tooltip title={clickToCopyText}>
                    {typeof value === "string" && value.length > 20
                      ? `${value.slice(0, 8)}...${value.slice(-8)}`
                      : formatValue(value, yesText, noText)}
                  </Tooltip>
                </Text>
              ) : typeof value === "object" ? (
                <pre className="m-0 text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded max-h-24 overflow-auto">
                  {formatValue(value, yesText, noText)}
                </pre>
              ) : (
                <Text className="font-mono text-xs">{formatValue(value, yesText, noText)}</Text>
              )}
            </Descriptions.Item>
          );
        })}
        {/* 显示额外字段 */}
        {extraKeys.map((key) => {
          const value = raw[key];
          return (
            <Descriptions.Item key={key} label={key}>
              {typeof value === "object" ? (
                <pre className="m-0 text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded max-h-24 overflow-auto">
                  {formatValue(value)}
                </pre>
              ) : (
                <Text className="font-mono text-xs">{formatValue(value)}</Text>
              )}
            </Descriptions.Item>
          );
        })}
      </Descriptions>
    </div>
  );
};

const ProxyPreviewModal = forwardRef<ProxyPreviewModalRef>((_, ref) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const [subscribeId, setSubscribeId] = useState<string>("");
  const [subscribeRemark, setSubscribeRemark] = useState<string>("");

  const { data, isLoading } = trpc.proxy.previewNodes.useQuery(
    { id: subscribeId },
    { enabled: !!subscribeId && visible }
  );

  useImperativeHandle(ref, () => ({
    open: (id: string, remark?: string | null) => {
      setSubscribeId(id);
      setSubscribeRemark(remark ?? t("proxy.preview.unnamed"));
      setVisible(true);
    }
  }));

  const handleClose = () => {
    setVisible(false);
    setSubscribeId("");
  };

  const columns: ColumnsType<ProxyNode> = [
    {
      title: t("proxy.preview.source"),
      dataIndex: "sourceIndex",
      width: 80,
      align: "center",
      render: (index: number, record) => (
        <Tooltip title={record.sourceUrl} placement="top">
          <Tag color={index === 0 ? "default" : "blue"} className="cursor-help">
            {index === 0 ? t("proxy.preview.manual") : `#${index}`}
          </Tag>
        </Tooltip>
      ),
      filters: [
        { text: t("proxy.preview.filters.validNodes"), value: false },
        { text: t("proxy.preview.filters.filtered"), value: true }
      ],
      onFilter: (value, record) => record.filtered === value
    },
    {
      title: t("proxy.preview.protocol"),
      dataIndex: "type",
      width: 100,
      align: "center",
      render: (type: string, record) => (
        <Tag color={record.filtered ? "default" : (typeColorMap[type] || "default")}>
          {type.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: "VMess", value: "vmess" },
        { text: "VLESS", value: "vless" },
        { text: "Shadowsocks", value: "ss" },
        { text: "Trojan", value: "trojan" },
        { text: "Hysteria2", value: "hysteria2" },
        { text: "Hysteria", value: "hysteria" },
        { text: "TUIC", value: "tuic" }
      ],
      onFilter: (value, record) => record.type === value
    },
    {
      title: t("proxy.preview.nodeName"),
      dataIndex: "name",
      ellipsis: true,
      render: (name: string, record) => (
        <Tooltip title={record.filtered ? `${name}\n\n⚠️ ${t("proxy.preview.filteredBy", { rule: record.filteredBy })}` : name}>
          <Text delete={record.filtered} type={record.filtered ? "secondary" : undefined}>
            {name}
          </Text>
        </Tooltip>
      )
    },
    {
      title: t("proxy.preview.server"),
      dataIndex: "server",
      width: 200,
      ellipsis: true,
      render: (server: string, record) => (
        <Tooltip title={server}>
          <Text
            copyable={{ text: server }}
            className="font-mono text-xs"
            type={record.filtered ? "secondary" : undefined}
          >
            {server}
          </Text>
        </Tooltip>
      )
    },
    {
      title: t("proxy.preview.port"),
      dataIndex: "port",
      width: 80,
      align: "center",
      render: (port: number, record) => (
        <Text className="font-mono text-xs" type={record.filtered ? "secondary" : undefined}>
          {port}
        </Text>
      )
    },
    {
      title: t("proxy.preview.transport"),
      dataIndex: "raw",
      width: 120,
      align: "center",
      render: (raw: Record<string, unknown>) => {
        const network = raw?.network as string | undefined;
        const tls = raw?.tls as boolean | undefined;
        return (
          <span className="text-xs">
            {network && <Tag>{network.toUpperCase()}</Tag>}
            {tls && <Tag color="green">TLS</Tag>}
            {!network && !tls && "-"}
          </span>
        );
      }
    },
    {
      title: t("proxy.preview.secret"),
      dataIndex: "raw",
      width: 180,
      render: (raw: Record<string, unknown>, record) => {
        const secret = (raw?.uuid || raw?.password || raw?.["auth-str"]) as string | undefined;
        if (!secret) return <Text type="secondary">-</Text>;
        return (
          <Text
            copyable={{ text: secret }}
            className="font-mono text-xs"
            type={record.filtered ? "secondary" : undefined}
          >
            <Tooltip title={t("proxy.preview.clickToCopyFull")}>
              {secret.length > 16 ? `${secret.slice(0, 8)}...${secret.slice(-4)}` : secret}
            </Tooltip>
          </Text>
        );
      }
    }
  ];

  const nodes: ProxyNode[] = data?.nodes ?? [];

  // 统计节点数量
  const totalCount = nodes.length;
  const filteredCount = nodes.filter((n: ProxyNode) => n.filtered).length;
  const activeCount = totalCount - filteredCount;

  // 统计各协议的节点数量（仅有效节点）
  const typeCounts = nodes
    .filter((n: ProxyNode) => !n.filtered)
    .reduce<Record<string, number>>((acc: Record<string, number>, node: ProxyNode) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {});

  // 移动端卡片视图（带展开详情）
  const MobileNodeCard = ({ node, index }: { node: ProxyNode; index: number }) => {
    const [expanded, setExpanded] = useState(false);
    const fields = protocolFields[node.type] || [];
    const raw = node.raw || {};
    const definedKeys = fields.map((f) => f.key);
    const basicKeys = ["name", "type", "server", "port"];
    const extraKeys = Object.keys(raw).filter(
      (k) => !definedKeys.includes(k) && !basicKeys.includes(k)
    );
    const hasDetails = fields.length > 0 || extraKeys.length > 0;

    return (
      <Card
        size="small"
        className={`${node.filtered ? "opacity-60" : ""}`}
        title={
          <div className="flex items-center justify-between gap-2">
            <Text
              delete={node.filtered}
              type={node.filtered ? "secondary" : undefined}
              className="truncate flex-1"
              title={node.name}
          >
            {node.name}
          </Text>
          <Tag color={node.filtered ? "default" : (typeColorMap[node.type] || "default")} className="!m-0 shrink-0">
            {node.type.toUpperCase()}
          </Tag>
        </div>
      }
    >
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">{t("proxy.preview.server")}:</span>
          <Text copyable={{ text: node.server }} className="font-mono truncate max-w-[180px]" title={node.server}>
            {node.server}
          </Text>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t("proxy.preview.port")}:</span>
          <span className="font-mono">{node.port}</span>
        </div>
        {node.raw?.network && (
          <div className="flex justify-between">
            <span className="text-gray-500">{t("proxy.preview.transport")}:</span>
            <span>
              <Tag className="!m-0">{String(node.raw.network).toUpperCase()}</Tag>
              {node.raw?.tls && <Tag color="green" className="!m-0 !ml-1">TLS</Tag>}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">{t("proxy.preview.source")}:</span>
          <Tag color={node.sourceIndex === 0 ? "default" : "blue"} className="!m-0">
            {node.sourceIndex === 0 ? t("proxy.preview.manual") : `#${node.sourceIndex}`}
          </Tag>
        </div>
        {node.filtered && node.filteredBy && (
          <div className="text-orange-500 text-xs mt-1">
            ⚠️ {t("proxy.preview.filteredBy", { rule: node.filteredBy })}
          </div>
        )}

        {/* 展开/收起按钮 */}
        {hasDetails && (
          <div
            className="text-center pt-2 border-t border-gray-200 dark:border-gray-700 mt-2 cursor-pointer text-blue-500"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? t("proxy.preview.collapse") || "收起" : t("proxy.preview.expand") || "展开详情"}
          </div>
        )}

        {/* 详情区域 */}
        {expanded && (
          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {fields.map((field) => {
              const value = raw[field.key];
              if (value === undefined) return null;
              return (
                <div key={field.key} className="flex justify-between items-start">
                  <span className="text-gray-500 shrink-0">{field.label}:</span>
                  {field.sensitive ? (
                    <Text copyable={{ text: formatValue(value) }} className="font-mono text-xs text-right max-w-[60%] break-all">
                      {typeof value === "string" && value.length > 20
                        ? `${value.slice(0, 8)}...${value.slice(-8)}`
                        : formatValue(value)}
                    </Text>
                  ) : typeof value === "object" ? (
                    <pre className="m-0 text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded max-w-[60%] overflow-x-auto">
                      {formatValue(value)}
                    </pre>
                  ) : (
                    <span className="font-mono text-xs text-right max-w-[60%] break-all">{formatValue(value)}</span>
                  )}
                </div>
              );
            })}
            {extraKeys.map((key) => {
              const value = raw[key];
              return (
                <div key={key} className="flex justify-between items-start">
                  <span className="text-gray-500 shrink-0">{key}:</span>
                  {typeof value === "object" ? (
                    <pre className="m-0 text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded max-w-[60%] overflow-x-auto">
                      {formatValue(value)}
                    </pre>
                  ) : (
                    <span className="font-mono text-xs text-right max-w-[60%] break-all">{formatValue(value)}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
    );
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <EyeOutlined />
          <span>{t("proxy.preview.title")}</span>
          {!isMobile && <span>- {subscribeRemark}</span>}
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={isMobile ? "100vw" : "95vw"}
      style={isMobile ? { top: 0, left: 0, maxWidth: "100vw", margin: 0, padding: 0, paddingBottom: 0 } : { top: 20, maxWidth: 1600 }}
      styles={{
        body: { padding: isMobile ? "12px 8px" : "16px 0" },
        wrapper: isMobile ? { overflow: "hidden" } : undefined
      }}
      className={isMobile ? "mobile-fullscreen-modal" : ""}
    >
      <Spin spinning={isLoading}>
        {!isLoading && nodes.length === 0 ? (
          <Empty description={t("proxy.preview.noNodes")} />
        ) : (
          <>
            {/* 移动端显示订阅名称 */}
            {isMobile && (
              <div className="text-sm text-slate-500 mb-2">{subscribeRemark}</div>
            )}

            {/* 统计信息 */}
            <div className="mb-4 px-2 md:px-4 flex items-center gap-2 flex-wrap">
              <Text type="secondary" className="text-xs md:text-sm">
                {t("proxy.preview.totalNodes", { total: totalCount, active: activeCount })}
                {filteredCount > 0 && <span>, {t("proxy.preview.filtered")} <Text type="warning">{filteredCount}</Text></span>}
                {!isMobile && <>({t("proxy.preview.clickToExpand")}):</>}
              </Text>
              {Object.entries(typeCounts).map(([type, count]) => (
                <Tag key={type} color={typeColorMap[type] || "default"} className="!text-xs">
                  {type.toUpperCase()}: {String(count)}
                </Tag>
              ))}
            </div>

            {isMobile ? (
              /* 移动端卡片列表 */
              <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
                {nodes.map((node, index) => (
                  <MobileNodeCard key={`${node.sourceIndex}-${node.server}-${node.port}-${index}`} node={node} index={index} />
                ))}
              </div>
            ) : (
              /* PC端表格 */
              <Table<ProxyNode>
                rowKey={(record, index) => `${record.sourceIndex}-${record.server}-${record.port}-${index}`}
                size="small"
                bordered
                columns={columns}
                dataSource={nodes}
                rowClassName={(record) => record.filtered ? "opacity-60" : ""}
                expandable={{
                  expandedRowRender: (record) => (
                    <ExpandedRow
                      record={record}
                      noDetailText={t("proxy.preview.noDetailInfo")}
                      clickToCopyText={t("proxy.preview.clickToCopy")}
                      yesText={t("proxy.common.confirm")}
                      noText={t("proxy.common.cancel")}
                    />
                  ),
                  rowExpandable: () => true
                }}
                pagination={{
                  defaultPageSize: 500,
                  showSizeChanger: true,
                  pageSizeOptions: ["20", "50", "100", "200", "300", "400", "500"],
                  showTotal: (total) => `${total}`
                }}
                scroll={{ x: 1000, y: "calc(100vh - 280px)" }}
              />
            )}
          </>
        )}
      </Spin>
    </Modal>
  );
});

ProxyPreviewModal.displayName = "ProxyPreviewModal";

export default ProxyPreviewModal;
