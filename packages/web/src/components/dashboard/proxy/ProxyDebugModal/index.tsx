import type { ProxyDebugFormat, ProxyDebugStep } from "@acme/types";
import {
  AimOutlined,
  BugOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { skipToken } from "@tanstack/react-query";
import {
  Alert,
  AutoComplete,
  Divider,
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
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "../../../../lib/trpc";
import {
  ConfigStepContent,
  DoneStepContent,
  ManualServersStepContent,
  MergeStepContent,
  OutputStepContent,
  SourceResultStepContent,
  SourceStartStepContent,
} from "./DebugStepContent";
import NodeTraceModal from "./NodeTraceModal";
import type { NodeTraceModalRef } from "./NodeTraceModal";

const { Text } = Typography;

export interface ProxyDebugModalRef {
  open: (subscribeId: string, format: ProxyDebugFormat) => void;
}

const ProxyDebugModal = forwardRef<ProxyDebugModalRef>((_, ref) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [subscribeId, setSubscribeId] = useState<string | null>(null);
  const [format, setFormat] = useState<ProxyDebugFormat>("clash");
  const [steps, setSteps] = useState<ProxyDebugStep[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const traceModalRef = useRef<NodeTraceModalRef>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  useImperativeHandle(ref, () => ({
    open: (id: string, fmt: ProxyDebugFormat) => {
      setSubscribeId(id);
      setFormat(fmt);
      setSteps([]);
      setDone(false);
      setError(null);
      setSearchValue("");
      setVisible(true);
    },
  }));

  // Subscribe to debug stream
  trpc.proxy.debugSubscription.useSubscription(
    subscribeId ? { id: subscribeId, format } : skipToken,
    {
      onData: (step: ProxyDebugStep) => {
        setSteps((prev) => {
          // If a source-result arrives, replace matching source-start
          if (step.type === "source-result") {
            const filtered = prev.filter(
              (s) =>
                !(
                  s.type === "source-start" &&
                  s.data.sourceIndex === step.data.sourceIndex
                ),
            );
            return [...filtered, step];
          }
          return [...prev, step];
        });
        if (step.type === "done") {
          setDone(true);
        }
        scrollToBottom();
      },
      onError: (err) => {
        setError(err.message);
      },
    },
  );

  // 收集所有节点名称（有效节点 + 被过滤节点）
  const allNodeNames = useMemo(() => {
    if (!done) return [];
    const names: { name: string; filtered: boolean }[] = [];

    // 从手动服务器步骤获取
    for (const step of steps) {
      if (step.type === "manual-servers") {
        for (const node of step.data.nodes) {
          names.push({ name: node.name, filtered: false });
        }
      }
    }

    // 从远程订阅源结果获取
    for (const step of steps) {
      if (step.type === "source-result") {
        for (const node of step.data.nodesAfterFilter) {
          names.push({ name: node.name, filtered: false });
        }
        for (const fn of step.data.filteredNodes) {
          names.push({ name: fn.node.name, filtered: true });
        }
      }
    }

    return names;
  }, [steps, done]);

  /** 处理追踪节点 */
  const handleTraceNode = useCallback((nodeName: string) => {
    traceModalRef.current?.open(nodeName);
  }, []);

  const handleClose = () => {
    setVisible(false);
    // Delay clearing subscribeId to allow cleanup
    setTimeout(() => {
      setSubscribeId(null);
      setSteps([]);
      setDone(false);
      setError(null);
      setSearchValue("");
    }, 300);
  };

  /** Map step type to display label */
  const getStepLabel = (step: ProxyDebugStep): string => {
    switch (step.type) {
      case "config":
        return t("proxy.debug.configParsing");
      case "manual-servers":
        return t("proxy.debug.manualServers");
      case "source-start":
        return `${t("proxy.debug.remoteSources")} #${step.data.sourceIndex + 1}`;
      case "source-result":
        return `${t("proxy.debug.remoteSources")} #${step.data.sourceIndex + 1}`;
      case "merge":
        return t("proxy.debug.nodeMerge");
      case "output":
        return t("proxy.debug.configBuild");
      case "done":
        return t("proxy.debug.complete");
    }
  };

  /** Get step status icon */
  const getStepStatus = (
    step: ProxyDebugStep,
  ): "process" | "finish" | "error" => {
    if (step.type === "source-start") return "process";
    if (step.type === "source-result" && step.data.error) return "error";
    return "finish";
  };

  const getStepIcon = (step: ProxyDebugStep) => {
    const status = getStepStatus(step);
    if (status === "process") return <LoadingOutlined />;
    if (status === "error") return <CloseCircleOutlined />;
    return <CheckCircleOutlined />;
  };

  const formatLabel: Record<ProxyDebugFormat, string> = {
    clash: "Clash",
    "clash-meta": "Clash Meta",
    "sing-box": "Sing-box",
    "sing-box-v12": "Sing-box v1.12",
  };

  /** Render step content */
  const renderStepContent = (step: ProxyDebugStep) => {
    switch (step.type) {
      case "config":
        return <ConfigStepContent step={step} />;
      case "manual-servers":
        return (
          <ManualServersStepContent
            step={step}
            onTraceNode={done ? handleTraceNode : undefined}
          />
        );
      case "source-start":
        return <SourceStartStepContent step={step} />;
      case "source-result":
        return (
          <SourceResultStepContent
            step={step}
            onTraceNode={done ? handleTraceNode : undefined}
          />
        );
      case "merge":
        return (
          <MergeStepContent
            step={step}
            onTraceNode={done ? handleTraceNode : undefined}
          />
        );
      case "output":
        return <OutputStepContent step={step} />;
      case "done":
        return <DoneStepContent step={step} />;
    }
  };

  // AutoComplete 选项
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

  return (
    <Modal
      title={
        <Space>
          <BugOutlined />
          <span>{t("proxy.debug.title")}</span>
          <Tag color="processing">{formatLabel[format]}</Tag>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width="calc(100vw - 48px)"
      centered
      destroyOnClose
      styles={{
        wrapper: { overflow: "hidden" },
        body: { maxHeight: "calc(100vh - 120px)", overflowY: "auto" },
      }}
    >
      {error && (
        <Alert
          type="error"
          message={t("proxy.debug.error")}
          description={error}
          showIcon
          className="mb-4"
        />
      )}

      {steps.length === 0 && !error && (
        <div className="flex items-center justify-center py-12">
          <Space>
            <Spin />
            <Text type="secondary">{t("proxy.debug.fetchingSource")}</Text>
          </Space>
        </div>
      )}

      {steps.length > 0 && (
        <Steps
          direction="vertical"
          size="small"
          current={steps.length - 1}
          items={steps.map((step) => ({
            title: (
              <Text strong className="!text-sm">
                {getStepLabel(step)}
              </Text>
            ),
            status: getStepStatus(step),
            icon: getStepIcon(step),
            description: (
              <div className="mt-2 mb-4">{renderStepContent(step)}</div>
            ),
          }))}
        />
      )}

      {!done && steps.length > 0 && !error && (
        <div className="flex items-center gap-2 py-2 pl-8">
          <LoadingOutlined spin />
          <Text type="secondary" className="!text-xs">
            {t("common.loading")}
          </Text>
        </div>
      )}

      {/* 节点追踪区域 */}
      {done && allNodeNames.length > 0 && subscribeId && (
        <>
          <Divider />
          <div className="flex items-center gap-3 flex-wrap">
            <AimOutlined className="text-blue-500 text-lg" />
            <Text strong>{t("proxy.debug.traceTitle")}</Text>
            <AutoComplete
              value={searchValue}
              options={autoCompleteOptions}
              onSearch={setSearchValue}
              onSelect={(value: string) => handleTraceNode(value)}
              placeholder={t("proxy.debug.traceSearchPlaceholder")}
              className="flex-1 min-w-[200px] max-w-[500px]"
              allowClear
              onClear={() => {
                setSearchValue("");
              }}
            />
            <Text type="secondary" className="!text-xs">
              {t("proxy.debug.traceNodeList")}: {allNodeNames.length}
            </Text>
          </div>

          <NodeTraceModal
            ref={traceModalRef}
            subscribeId={subscribeId}
            format={format}
            allNodeNames={allNodeNames}
          />
        </>
      )}

      <div ref={bottomRef} />
    </Modal>
  );
});

ProxyDebugModal.displayName = "ProxyDebugModal";

export default ProxyDebugModal;
