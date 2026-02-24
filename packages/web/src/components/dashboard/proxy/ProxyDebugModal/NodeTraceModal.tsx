import type { ProxyDebugFormat, ProxyNodeTraceStep } from "@acme/types";
import {
  AimOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";
import {
  Alert,
  AutoComplete,
  Button,
  Collapse,
  Descriptions,
  Empty,
  Modal,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
} from "antd";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "../../../../lib/trpc";

const { Text } = Typography;

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

/** 追踪步骤: 来源 */
const SourceTraceContent = ({
  step,
}: {
  step: Extract<ProxyNodeTraceStep, { type: "source" }>;
}) => {
  const { t } = useTranslation();
  const { data } = step;

  return (
    <div className="flex flex-col gap-2">
      <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
        <Descriptions.Item label={t("proxy.debug.traceSourceIndex")}>
          <Tag color={data.sourceIndex === 0 ? "default" : "blue"}>
            {data.sourceIndex === 0
              ? t("proxy.debug.traceManual")
              : `#${data.sourceIndex}`}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.traceSourceUrl")}>
          <Text className="!text-xs break-all">{data.sourceUrl}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={t("proxy.debug.traceSourceFormat")}>
          <Tag color="processing">{data.format}</Tag>
        </Descriptions.Item>
      </Descriptions>
      <Collapse
        size="small"
        defaultActiveKey={data.rawUrl ? ["rawUrl"] : []}
        items={[
          ...(data.rawUrl
            ? [
                {
                  key: "rawUrl",
                  label: t("proxy.debug.traceRawUrl"),
                  children: <CodeBlock content={data.rawUrl} maxHeight={300} />,
                },
              ]
            : [
                {
                  key: "raw",
                  label: t("proxy.debug.traceRawData"),
                  children: (
                    <CodeBlock
                      content={JSON.stringify(data.rawData, null, 2)}
                      maxHeight={300}
                    />
                  ),
                },
              ]),
        ]}
      />
    </div>
  );
};

/** 追踪步骤: 解析 */
const ParseTraceContent = ({
  step,
}: {
  step: Extract<ProxyNodeTraceStep, { type: "parse" }>;
}) => {
  const { t } = useTranslation();

  return (
    <Collapse
      size="small"
      defaultActiveKey={["clash"]}
      items={[
        {
          key: "clash",
          label: t("proxy.debug.traceClashProxy"),
          children: (
            <CodeBlock
              content={JSON.stringify(step.data.clashProxy, null, 2)}
              maxHeight={300}
            />
          ),
        },
      ]}
    />
  );
};

/** 追踪步骤: 过滤 */
const FilterTraceContent = ({
  step,
}: {
  step: Extract<ProxyNodeTraceStep, { type: "filter" }>;
}) => {
  const { t } = useTranslation();
  const { data } = step;

  return (
    <div className="flex flex-col gap-2">
      <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
        <Descriptions.Item label={t("proxy.debug.traceFilter")}>
          {data.passed ? (
            <Tag icon={<CheckCircleOutlined />} color="success">
              {t("proxy.debug.traceFilterPassed")}
            </Tag>
          ) : (
            <Tag icon={<CloseCircleOutlined />} color="error">
              {t("proxy.debug.traceFilterBlocked")}
            </Tag>
          )}
        </Descriptions.Item>
        {data.matchedRule && (
          <Descriptions.Item label={t("proxy.debug.traceMatchedRule")}>
            <Tag color="orange">{data.matchedRule}</Tag>
          </Descriptions.Item>
        )}
      </Descriptions>
      {data.filtersApplied.length > 0 && (
        <Collapse
          size="small"
          items={[
            {
              key: "rules",
              label: (
                <span>
                  {t("proxy.debug.traceFilterRules")}{" "}
                  <Tag>{data.filtersApplied.length}</Tag>
                </span>
              ),
              children: (
                <div className="flex flex-wrap gap-1">
                  {data.filtersApplied.map((f) => (
                    <Tag
                      key={f}
                      color={f === data.matchedRule ? "orange" : "default"}
                    >
                      {f}
                      {f === data.matchedRule && " ✓"}
                    </Tag>
                  ))}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

/** 追踪步骤: 名称富化 */
const EnrichTraceContent = ({
  step,
}: {
  step: Extract<ProxyNodeTraceStep, { type: "enrich" }>;
}) => {
  const { t } = useTranslation();
  const { data } = step;
  const nameChanged = data.originalName !== data.enrichedName;

  return (
    <Descriptions size="small" column={1} bordered>
      <Descriptions.Item label={t("proxy.debug.traceOriginalName")}>
        <Text className="!text-xs font-mono">{data.originalName}</Text>
      </Descriptions.Item>
      <Descriptions.Item label={t("proxy.debug.traceEnrichedName")}>
        <Text className="!text-xs font-mono">
          {data.enrichedName}
          {nameChanged && (
            <Tag color="green" className="ml-2">
              ✨
            </Tag>
          )}
        </Text>
      </Descriptions.Item>
    </Descriptions>
  );
};

/** 追踪步骤: 合并 */
const MergeTraceContent = ({
  step,
}: {
  step: Extract<ProxyNodeTraceStep, { type: "merge" }>;
}) => {
  const { t } = useTranslation();
  const { data } = step;

  return (
    <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
      <Descriptions.Item label={t("proxy.debug.tracePosition")}>
        <Tag color="blue">
          #{data.positionInFinalList} / {data.totalNodes}
        </Tag>
      </Descriptions.Item>
    </Descriptions>
  );
};

/** 追踪步骤: 分组分配 */
const GroupAssignTraceContent = ({
  step,
}: {
  step: Extract<ProxyNodeTraceStep, { type: "group-assign" }>;
}) => {
  const { t } = useTranslation();
  const { data } = step;

  if (data.assignedGroups.length === 0) {
    return (
      <Text type="secondary">{t("proxy.debug.traceNoGroupAssigned")}</Text>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {data.assignedGroups.map((g) => (
        <Tag key={g.name} color="purple">
          {g.name}{" "}
          <Text type="secondary" className="!text-xs">
            ({g.type})
          </Text>
        </Tag>
      ))}
    </div>
  );
};

/** 追踪步骤: 格式转换 */
const ConvertTraceContent = ({
  step,
}: {
  step: Extract<ProxyNodeTraceStep, { type: "convert" }>;
}) => {
  const { t } = useTranslation();

  return (
    <Collapse
      size="small"
      defaultActiveKey={["outbound"]}
      items={[
        {
          key: "outbound",
          label: t("proxy.debug.traceSingboxOutbound"),
          children: (
            <CodeBlock
              content={JSON.stringify(step.data.singboxOutbound, null, 2)}
              maxHeight={400}
            />
          ),
        },
      ]}
    />
  );
};

/** 追踪步骤: 最终输出 */
const OutputTraceContent = ({
  step,
}: {
  step: Extract<ProxyNodeTraceStep, { type: "output" }>;
}) => {
  const { t } = useTranslation();

  return (
    <Collapse
      size="small"
      defaultActiveKey={["fragment"]}
      items={[
        {
          key: "fragment",
          label: t("proxy.debug.traceConfigFragment"),
          children: (
            <CodeBlock content={step.data.configFragment} maxHeight={400} />
          ),
        },
      ]}
    />
  );
};

/** 所有可能的追踪步骤类型，按逻辑顺序 */
const ALL_TRACE_STEP_TYPES = [
  "source",
  "parse",
  "filter",
  "enrich",
  "merge",
  "group-assign",
  "convert",
  "output",
] as const;

/** 追踪步骤内容渲染 */
const TraceStepsContent = ({
  data,
  format,
}: {
  data: { nodeName: string; steps: ProxyNodeTraceStep[] };
  format: ProxyDebugFormat;
}) => {
  const { t } = useTranslation();

  const renderStepContent = (step: ProxyNodeTraceStep) => {
    switch (step.type) {
      case "source":
        return <SourceTraceContent step={step} />;
      case "parse":
        return <ParseTraceContent step={step} />;
      case "filter":
        return <FilterTraceContent step={step} />;
      case "enrich":
        return <EnrichTraceContent step={step} />;
      case "merge":
        return <MergeTraceContent step={step} />;
      case "group-assign":
        return <GroupAssignTraceContent step={step} />;
      case "convert":
        return <ConvertTraceContent step={step} />;
      case "output":
        return <OutputTraceContent step={step} />;
    }
  };

  const existingStepTypes = new Set(data.steps.map((s) => s.type));
  const filterStep = data.steps.find((s) => s.type === "filter");
  const isFiltered = filterStep?.type === "filter" && !filterStep.data.passed;

  const displaySteps = ALL_TRACE_STEP_TYPES.filter((stepType) => {
    if (
      stepType === "convert" &&
      format !== "sing-box" &&
      format !== "sing-box-v12"
    ) {
      return false;
    }
    return true;
  }).map((stepType) => {
    const actualStep = data.steps.find((s) => s.type === stepType);
    const isSkipped = !existingStepTypes.has(stepType) && isFiltered;
    return { stepType, actualStep, isSkipped };
  });

  const getStepLabel = (
    stepType: (typeof ALL_TRACE_STEP_TYPES)[number],
  ): string => {
    const labels: Record<string, string> = {
      source: t("proxy.debug.traceSource"),
      parse: t("proxy.debug.traceParse"),
      filter: t("proxy.debug.traceFilter"),
      enrich: t("proxy.debug.traceEnrich"),
      merge: t("proxy.debug.traceMerge"),
      "group-assign": t("proxy.debug.traceGroupAssign"),
      convert: t("proxy.debug.traceConvert"),
      output: t("proxy.debug.traceOutput"),
    };
    return labels[stepType] || stepType;
  };

  return (
    <Steps
      direction="vertical"
      size="small"
      current={displaySteps.length - 1}
      items={displaySteps.map(({ stepType, actualStep, isSkipped }) => ({
        title: (
          <Text
            strong
            className="!text-sm"
            type={isSkipped ? "secondary" : undefined}
          >
            {getStepLabel(stepType)}
          </Text>
        ),
        status: isSkipped
          ? ("wait" as const)
          : actualStep
            ? ("finish" as const)
            : ("wait" as const),
        icon: isSkipped ? (
          <MinusCircleOutlined className="text-gray-400" />
        ) : actualStep ? (
          stepType === "filter" && isFiltered ? (
            <CloseCircleOutlined className="text-red-500" />
          ) : (
            <CheckCircleOutlined />
          )
        ) : undefined,
        description: isSkipped ? (
          <Text type="secondary" className="!text-xs">
            {t("proxy.debug.traceSkipped")}
          </Text>
        ) : actualStep ? (
          <div className="mt-2 mb-4">{renderStepContent(actualStep)}</div>
        ) : null,
      }))}
    />
  );
};

// ============================================
// NodeTraceModal
// ============================================

export interface NodeTraceModalRef {
  open: (nodeName?: string) => void;
}

interface NodeTraceModalProps {
  subscribeId: string;
  format: ProxyDebugFormat;
  allNodeNames: { name: string; filtered: boolean }[];
}

const NodeTraceModal = forwardRef<NodeTraceModalRef, NodeTraceModalProps>(
  ({ subscribeId, format, allNodeNames }, ref) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [tracingNodeName, setTracingNodeName] = useState<string | null>(null);
    const [searchValue, setSearchValue] = useState("");

    useImperativeHandle(ref, () => ({
      open: (nodeName?: string) => {
        if (nodeName) {
          setTracingNodeName(nodeName);
          setSearchValue(nodeName);
        } else {
          setTracingNodeName(null);
          setSearchValue("");
        }
        setVisible(true);
      },
    }));

    const { data, isLoading, error } = trpc.proxy.traceNode.useQuery(
      tracingNodeName
        ? { id: subscribeId, format, nodeName: tracingNodeName }
        : undefined!,
      { enabled: !!tracingNodeName },
    );

    const handleTraceNode = useCallback((nodeName: string) => {
      setTracingNodeName(nodeName);
      setSearchValue(nodeName);
    }, []);

    const handleClose = () => {
      setVisible(false);
    };

    const autoCompleteOptions = useMemo(() => {
      const query = searchValue.toLowerCase();
      return allNodeNames
        .filter((n) => !query || n.name.toLowerCase().includes(query))
        .slice(0, 50)
        .map((n) => ({
          value: n.name,
          label: (
            <div className="flex items-center justify-between">
              <Text
                className="!text-xs truncate flex-1"
                type={n.filtered ? "secondary" : undefined}
                delete={n.filtered}
              >
                {n.name}
              </Text>
              {n.filtered && (
                <Tag color="orange" className="!text-xs ml-1 shrink-0">
                  {t("proxy.debug.traceFilteredLabel")}
                </Tag>
              )}
            </div>
          ),
        }));
    }, [allNodeNames, searchValue, t]);

    const filterStep = data?.steps.find((s) => s.type === "filter");
    const isFiltered = filterStep?.type === "filter" && !filterStep.data.passed;

    return (
      <Modal
        title={
          <div className="flex items-center gap-3">
            <Button
              type="text"
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={handleClose}
            />
            <AimOutlined className="text-blue-500" />
            <span>{t("proxy.debug.traceTitle")}</span>
            {tracingNodeName && <Tag color="blue">{tracingNodeName}</Tag>}
            {isFiltered && (
              <Tag color="orange">{t("proxy.debug.traceFilteredLabel")}</Tag>
            )}
          </div>
        }
        open={visible}
        onCancel={handleClose}
        footer={null}
        width="calc(100vw - 48px)"
        centered
        destroyOnClose={false}
        styles={{
          wrapper: { overflow: "hidden" },
          body: { maxHeight: "calc(100vh - 120px)", overflowY: "auto" },
        }}
      >
        {/* 搜索栏 */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <AutoComplete
            value={searchValue}
            options={autoCompleteOptions}
            onSearch={setSearchValue}
            onSelect={(value: string) => handleTraceNode(value)}
            placeholder={t("proxy.debug.traceSearchPlaceholder")}
            className="flex-1 min-w-[200px] max-w-[500px]"
            allowClear
            onClear={() => {
              setTracingNodeName(null);
              setSearchValue("");
            }}
          />
          <Text type="secondary" className="!text-xs">
            {t("proxy.debug.traceNodeList")}: {allNodeNames.length}
          </Text>
        </div>

        {/* 内容区 */}
        {!tracingNodeName && (
          <div className="text-center py-12">
            <Empty description={t("proxy.debug.traceSelectNode")} />
          </div>
        )}

        {tracingNodeName && isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spin indicator={<LoadingOutlined spin />} />
            <Text type="secondary" className="ml-2">
              {t("proxy.debug.traceLoading")}
            </Text>
          </div>
        )}

        {tracingNodeName && error && (
          <Alert
            type="error"
            message={t("proxy.debug.error")}
            description={error.message}
            showIcon
          />
        )}

        {tracingNodeName && data && data.steps.length === 0 && !isLoading && (
          <Empty description={t("proxy.debug.traceNodeNotFound")} />
        )}

        {tracingNodeName && data && data.steps.length > 0 && (
          <TraceStepsContent data={data} format={format} />
        )}
      </Modal>
    );
  },
);

NodeTraceModal.displayName = "NodeTraceModal";

export default NodeTraceModal;
