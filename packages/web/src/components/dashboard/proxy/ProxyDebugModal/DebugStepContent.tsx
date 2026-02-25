import type { ProxyDebugStep } from "@acme/types";
import {
  AimOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import {
  Button,
  Collapse,
  Descriptions,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useTranslation } from "react-i18next";

const { Text, Paragraph } = Typography;

/** 渲染 JSON 或 YAML 格式的代码块 */
const CodeBlock = ({
  content,
  maxHeight,
}: {
  content: string;
  maxHeight?: number;
}) => (
  <pre
    className="!m-0 !p-3 !text-xs !bg-gray-50 dark:!bg-gray-900 !rounded-md !overflow-auto !whitespace-pre-wrap !break-all !font-mono"
    style={{ maxHeight: maxHeight ?? 400 }}
  >
    {content}
  </pre>
);

/** 配置解析步骤 */
export const ConfigStepContent = ({
  step,
}: {
  step: Extract<ProxyDebugStep, { type: "config" }>;
}) => {
  const { t } = useTranslation();
  const { data } = step;

  return (
    <Collapse
      size="small"
      items={[
        {
          key: "urls",
          label: (
            <Space>
              <span>{t("proxy.debug.subscribeUrls")}</span>
              <Tag color="blue">{data.subscribeUrls.length}</Tag>
            </Space>
          ),
          children: (
            <div className="flex flex-col gap-1">
              {data.subscribeUrls.map((url, i) => (
                <Text key={i} code className="!text-xs break-all">
                  {url}
                </Text>
              ))}
            </div>
          ),
        },
        {
          key: "filters",
          label: (
            <Space>
              <span>{t("proxy.debug.filterRules")}</span>
              <Tag color="orange">{data.filters.length}</Tag>
            </Space>
          ),
          children:
            data.filters.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {data.filters.map((f, i) => (
                  <Tag key={i}>{f}</Tag>
                ))}
              </div>
            ) : (
              <Text type="secondary">-</Text>
            ),
        },
        {
          key: "groups",
          label: (
            <Space>
              <span>{t("proxy.debug.groupConfig")}</span>
              <Tag color="purple">{data.groups.length}</Tag>
            </Space>
          ),
          children: (
            <CodeBlock content={JSON.stringify(data.groups, null, 2)} />
          ),
        },
        {
          key: "ruleProviders",
          label: (
            <Space>
              <span>{t("proxy.debug.ruleProviders")}</span>
              <Tag color="cyan">{Object.keys(data.ruleProviders).length}</Tag>
            </Space>
          ),
          children: (
            <CodeBlock content={JSON.stringify(data.ruleProviders, null, 2)} />
          ),
        },
        {
          key: "customConfig",
          label: (
            <Space>
              <span>{t("proxy.debug.customConfigRules")}</span>
              <Tag>{data.customConfig.length}</Tag>
            </Space>
          ),
          children: (
            <CodeBlock content={JSON.stringify(data.customConfig, null, 2)} />
          ),
        },
        {
          key: "servers",
          label: (
            <Space>
              <span>{t("proxy.debug.manualServers")}</span>
              <Tag>{data.servers.length}</Tag>
            </Space>
          ),
          children: (
            <CodeBlock content={JSON.stringify(data.servers, null, 2)} />
          ),
        },
        {
          key: "dnsConfig",
          label: (
            <Space>
              <span>{t("proxy.debug.dnsConfig")}</span>
              <Tag color="geekblue">
                {Object.keys(data.dnsConfig.overrides).length > 0
                  ? `shared + ${Object.keys(data.dnsConfig.overrides).join(", ")}`
                  : "shared"}
              </Tag>
            </Space>
          ),
          children: (
            <CodeBlock content={JSON.stringify(data.dnsConfig, null, 2)} />
          ),
        },
      ]}
    />
  );
};

/** 手动服务器步骤 */
export const ManualServersStepContent = ({
  step,
  onTraceNode,
}: {
  step: Extract<ProxyDebugStep, { type: "manual-servers" }>;
  onTraceNode?: (nodeName: string) => void;
}) => {
  const { t } = useTranslation();
  const { data } = step;

  if (data.count === 0) {
    return <Text type="secondary">{t("proxy.debug.noManualServers")}</Text>;
  }

  return (
    <div>
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label={t("proxy.debug.serverCount")}>
          <Tag color="blue">{data.count}</Tag>
        </Descriptions.Item>
      </Descriptions>
      <div className="mt-2">
        <Table
          size="small"
          pagination={false}
          dataSource={data.nodes}
          rowKey={(_, i) => String(i)}
          columns={[
            {
              title: t("proxy.preview.nodeName"),
              dataIndex: "name",
              ellipsis: true,
            },
            {
              title: t("proxy.preview.protocol"),
              dataIndex: "type",
              width: 80,
              render: (v: string) => <Tag>{v}</Tag>,
            },
            {
              title: t("proxy.preview.server"),
              dataIndex: "server",
              ellipsis: true,
            },
            {
              title: t("proxy.preview.port"),
              dataIndex: "port",
              width: 70,
            },
            ...(onTraceNode
              ? [
                  {
                    title: "",
                    width: 40,
                    render: (_: unknown, record: { name: string }) => (
                      <Tooltip title={t("proxy.debug.traceNode")}>
                        <Button
                          type="text"
                          size="small"
                          icon={<AimOutlined />}
                          onClick={() => onTraceNode(record.name)}
                        />
                      </Tooltip>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    </div>
  );
};

/** 正在获取订阅源 */
export const SourceStartStepContent = ({
  step,
}: {
  step: Extract<ProxyDebugStep, { type: "source-start" }>;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <LoadingOutlined spin />
      <Text>{t("proxy.debug.fetchingSource")}</Text>
      <Text code className="!text-xs break-all">
        {step.data.url}
      </Text>
    </div>
  );
};

/** 订阅源获取结果 */
export const SourceResultStepContent = ({
  step,
  onTraceNode,
}: {
  step: Extract<ProxyDebugStep, { type: "source-result" }>;
  onTraceNode?: (nodeName: string) => void;
}) => {
  const { t } = useTranslation();
  const { data } = step;

  return (
    <div className="flex flex-col gap-2">
      {/* Basic info */}
      <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
        <Descriptions.Item label={t("proxy.debug.sourceUrl")}>
          <Text className="!text-xs break-all">{data.url}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.httpStatus")}>
          {data.error ? (
            <Tag icon={<CloseCircleOutlined />} color="error">
              {t("proxy.debug.error")}
            </Tag>
          ) : (
            <Tag
              icon={<CheckCircleOutlined />}
              color={data.httpStatus === 200 ? "success" : "warning"}
            >
              {data.httpStatus}
            </Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.detectedFormat")}>
          <Tag color="processing">{data.format}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.dataSource")}>
          {data.cached ? (
            <Tag color="green">{t("proxy.debug.cached")}</Tag>
          ) : (
            <Tag color="blue">{t("proxy.debug.liveFetch")}</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.fetchDuration")}>
          {data.fetchDurationMs}ms
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.parsedNodes")}>
          <Tag color="blue">{data.parsedNodeCount}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.afterFilter")}>
          <Tag color="green">{data.nodesAfterFilter.length}</Tag>
          {data.filteredNodes.length > 0 && (
            <Tag color="orange" className="ml-1">
              -{data.filteredNodes.length}
            </Tag>
          )}
        </Descriptions.Item>
      </Descriptions>

      {data.error && (
        <Paragraph type="danger" className="!text-xs !mb-0">
          {data.error}
        </Paragraph>
      )}

      {/* Collapsible details */}
      <Collapse
        size="small"
        items={[
          {
            key: "raw",
            label: (
              <Space>
                <span>{t("proxy.debug.rawResponse")}</span>
                <Tag>
                  {data.rawText.length} {t("proxy.debug.chars")}
                </Tag>
              </Space>
            ),
            children: <CodeBlock content={data.rawText} maxHeight={300} />,
          },
          ...(data.filteredNodes.length > 0
            ? [
                {
                  key: "filtered",
                  label: (
                    <Space>
                      <span>{t("proxy.debug.filteredNodes")}</span>
                      <Tag color="orange">{data.filteredNodes.length}</Tag>
                    </Space>
                  ),
                  children: (
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={data.filteredNodes}
                      rowKey={(_, i) => String(i)}
                      columns={[
                        {
                          title: t("proxy.preview.nodeName"),
                          dataIndex: ["node", "name"],
                          ellipsis: true,
                        },
                        {
                          title: t("proxy.debug.matchedRule"),
                          dataIndex: "matchedRule",
                          width: 120,
                          render: (v: string) => <Tag color="orange">{v}</Tag>,
                        },
                        ...(onTraceNode
                          ? [
                              {
                                title: "",
                                width: 40,
                                render: (
                                  _: unknown,
                                  record: { node: { name: string } },
                                ) => (
                                  <Tooltip title={t("proxy.debug.traceNode")}>
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<AimOutlined />}
                                      onClick={() =>
                                        onTraceNode(record.node.name)
                                      }
                                    />
                                  </Tooltip>
                                ),
                              },
                            ]
                          : []),
                      ]}
                    />
                  ),
                },
              ]
            : []),
          {
            key: "nodes",
            label: (
              <Space>
                <span>{t("proxy.debug.nodesAfterFilter")}</span>
                <Tag color="green">{data.nodesAfterFilter.length}</Tag>
              </Space>
            ),
            children: (
              <Table
                size="small"
                pagination={false}
                scroll={{ y: 300 }}
                dataSource={data.nodesAfterFilter}
                rowKey={(_, i) => String(i)}
                columns={[
                  {
                    title: t("proxy.preview.nodeName"),
                    dataIndex: "name",
                    ellipsis: true,
                  },
                  {
                    title: t("proxy.preview.protocol"),
                    dataIndex: "type",
                    width: 80,
                    render: (v: string) => <Tag>{v}</Tag>,
                  },
                  {
                    title: t("proxy.preview.server"),
                    dataIndex: "server",
                    ellipsis: true,
                  },
                  {
                    title: t("proxy.preview.port"),
                    dataIndex: "port",
                    width: 70,
                  },
                  ...(onTraceNode
                    ? [
                        {
                          title: "",
                          width: 50,
                          render: (_: unknown, record: { name: string }) => (
                            <Tooltip title={t("proxy.debug.traceNode")}>
                              <Button
                                type="link"
                                size="small"
                                icon={<AimOutlined />}
                                onClick={() => onTraceNode(record.name)}
                              />
                            </Tooltip>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

/** 节点合并步骤 */
export const MergeStepContent = ({
  step,
  onTraceNode,
}: {
  step: Extract<ProxyDebugStep, { type: "merge" }>;
  onTraceNode?: (nodeName: string) => void;
}) => {
  const { t } = useTranslation();
  const { data } = step;

  return (
    <div className="flex flex-col gap-2">
      <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
        <Descriptions.Item label={t("proxy.debug.totalNodes")}>
          <Tag color="blue">{data.totalNodesBeforeFilter}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.activeNodes")}>
          <Tag color="green">{data.totalNodesAfterFilter}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.filteredCount")}>
          <Tag color="orange">{data.totalFiltered}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.nodeStats")}>
          {data.finalNodeNames.length} nodes
        </Descriptions.Item>
      </Descriptions>

      <Collapse
        size="small"
        items={[
          {
            key: "finalNodes",
            label: (
              <Space>
                <span>{t("proxy.debug.nodeStats")}</span>
                <Tag>{data.finalNodeNames.length}</Tag>
              </Space>
            ),
            children: (
              <div className="flex flex-wrap gap-1">
                {data.finalNodeNames.map((name, i) =>
                  onTraceNode ? (
                    <Tooltip key={name} title={t("proxy.debug.traceNode")}>
                      <Tag
                        className="cursor-pointer"
                        color="blue"
                        onClick={() => onTraceNode(name)}
                      >
                        <AimOutlined className="mr-1" />
                        {name}
                      </Tag>
                    </Tooltip>
                  ) : (
                    <Tag key={name}>{name}</Tag>
                  ),
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

/** 配置构建步骤 */
export const OutputStepContent = ({
  step,
}: {
  step: Extract<ProxyDebugStep, { type: "output" }>;
}) => {
  const { t } = useTranslation();
  const { data } = step;

  return (
    <div className="flex flex-col gap-2">
      <Descriptions size="small" column={{ xs: 1, sm: 3 }} bordered>
        <Descriptions.Item label={t("proxy.debug.proxyGroups")}>
          <Tag color="purple">{data.proxyGroupCount}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.rules")}>
          <Tag color="cyan">{data.ruleCount}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.ruleProviders")}>
          <Tag>{data.ruleProviderCount}</Tag>
        </Descriptions.Item>
      </Descriptions>

      <Collapse
        size="small"
        items={[
          {
            key: "config",
            label: (
              <Space>
                <span>{t("proxy.debug.finalConfig")}</span>
                <Tag>
                  {data.configOutput.length} {t("proxy.debug.chars")}
                </Tag>
              </Space>
            ),
            children: <CodeBlock content={data.configOutput} maxHeight={500} />,
          },
        ]}
      />
    </div>
  );
};

/** 完成步骤 */
export const DoneStepContent = ({
  step,
}: {
  step: Extract<ProxyDebugStep, { type: "done" }>;
}) => {
  const { t } = useTranslation();

  return (
    <Descriptions size="small" column={1}>
      <Descriptions.Item label={t("proxy.debug.totalDuration")}>
        <Tag color="green">
          <CheckCircleOutlined className="mr-1" />
          {step.data.totalDurationMs}ms
        </Tag>
      </Descriptions.Item>
    </Descriptions>
  );
};
