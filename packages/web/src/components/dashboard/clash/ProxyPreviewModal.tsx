import { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Table, Tooltip, Tag, Typography, Spin, Empty, Descriptions } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined } from "@ant-design/icons";
import { trpc } from "../../../lib/trpc";

const { Text } = Typography;

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
const formatValue = (value: unknown): string => {
  if (value === undefined || value === null) return "-";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

/** 渲染展开行内容 */
const ExpandedRow = ({ record }: { record: ProxyNode }) => {
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
        <Text type="secondary">暂无详细配置信息</Text>
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
                <Text copyable={{ text: formatValue(value) }} className="font-mono text-xs">
                  <Tooltip title="点击复制">
                    {typeof value === "string" && value.length > 20
                      ? `${value.slice(0, 8)}...${value.slice(-8)}`
                      : formatValue(value)}
                  </Tooltip>
                </Text>
              ) : typeof value === "object" ? (
                <pre className="m-0 text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded max-h-24 overflow-auto">
                  {formatValue(value)}
                </pre>
              ) : (
                <Text className="font-mono text-xs">{formatValue(value)}</Text>
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
  const [visible, setVisible] = useState(false);
  const [subscribeId, setSubscribeId] = useState<string>("");
  const [subscribeRemark, setSubscribeRemark] = useState<string>("");

  const { data, isLoading } = trpc.clash.previewNodes.useQuery(
    { id: subscribeId },
    { enabled: !!subscribeId && visible }
  );

  useImperativeHandle(ref, () => ({
    open: (id: string, remark?: string | null) => {
      setSubscribeId(id);
      setSubscribeRemark(remark ?? "未命名订阅");
      setVisible(true);
    }
  }));

  const handleClose = () => {
    setVisible(false);
    setSubscribeId("");
  };

  const columns: ColumnsType<ProxyNode> = [
    {
      title: "来源",
      dataIndex: "sourceIndex",
      width: 80,
      align: "center",
      render: (index: number, record) => (
        <Tooltip title={record.sourceUrl} placement="top">
          <Tag color={index === 0 ? "default" : "blue"} className="cursor-help">
            {index === 0 ? "手动" : `#${index}`}
          </Tag>
        </Tooltip>
      )
    },
    {
      title: "协议",
      dataIndex: "type",
      width: 100,
      align: "center",
      render: (type: string) => (
        <Tag color={typeColorMap[type] || "default"}>
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
      title: "节点名称",
      dataIndex: "name",
      ellipsis: true,
      render: (name: string) => (
        <Tooltip title={name}>
          <Text>{name}</Text>
        </Tooltip>
      )
    },
    {
      title: "服务器",
      dataIndex: "server",
      width: 200,
      ellipsis: true,
      render: (server: string) => (
        <Tooltip title={server}>
          <Text copyable={{ text: server }} className="font-mono text-xs">
            {server}
          </Text>
        </Tooltip>
      )
    },
    {
      title: "端口",
      dataIndex: "port",
      width: 80,
      align: "center",
      render: (port: number) => (
        <Text className="font-mono text-xs">{port}</Text>
      )
    },
    {
      title: "传输/TLS",
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
      title: "密钥/UUID",
      dataIndex: "raw",
      width: 180,
      render: (raw: Record<string, unknown>) => {
        const secret = (raw?.uuid || raw?.password || raw?.["auth-str"]) as string | undefined;
        if (!secret) return <Text type="secondary">-</Text>;
        return (
          <Text copyable={{ text: secret }} className="font-mono text-xs">
            <Tooltip title="点击复制完整密钥">
              {secret.length > 16 ? `${secret.slice(0, 8)}...${secret.slice(-4)}` : secret}
            </Tooltip>
          </Text>
        );
      }
    }
  ];

  const nodes = data?.nodes ?? [];

  // 统计各协议的节点数量
  const typeCounts = nodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <EyeOutlined />
          <span>节点预览 - {subscribeRemark}</span>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width="95vw"
      style={{ top: 20, maxWidth: 1600 }}
      styles={{ body: { padding: "16px 0" } }}
    >
      <Spin spinning={isLoading}>
        {!isLoading && nodes.length === 0 ? (
          <Empty description="未找到节点" />
        ) : (
          <>
            {/* 统计信息 */}
            <div className="mb-4 px-4 flex items-center gap-2 flex-wrap">
              <Text type="secondary">共 {nodes.length} 个节点（点击行展开查看详细配置）：</Text>
              {Object.entries(typeCounts).map(([type, count]) => (
                <Tag key={type} color={typeColorMap[type] || "default"}>
                  {type.toUpperCase()}: {count}
                </Tag>
              ))}
            </div>

            <Table<ProxyNode>
              rowKey={(record, index) => `${record.sourceIndex}-${record.server}-${record.port}-${index}`}
              size="small"
              bordered
              columns={columns}
              dataSource={nodes}
              expandable={{
                expandedRowRender: (record) => <ExpandedRow record={record} />,
                rowExpandable: () => true
              }}
              pagination={{
                defaultPageSize: 50,
                showSizeChanger: true,
                pageSizeOptions: ["20", "50", "100", "200", "300", "400", "500"],
                showTotal: (total) => `共 ${total} 条`
              }}
              scroll={{ y: "calc(100vh - 280px)" }}
            />
          </>
        )}
      </Spin>
    </Modal>
  );
});

ProxyPreviewModal.displayName = "ProxyPreviewModal";

export default ProxyPreviewModal;
