import type { ProxyDebugFormat, ProxyDebugStep } from "@acme/types";
import {
  BugOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { skipToken } from "@tanstack/react-query";
import { Alert, Modal, Space, Spin, Steps, Tag, Typography } from "antd";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
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
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const handleClose = () => {
    setVisible(false);
    // Delay clearing subscribeId to allow cleanup
    setTimeout(() => {
      setSubscribeId(null);
      setSteps([]);
      setDone(false);
      setError(null);
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
        return <ManualServersStepContent step={step} />;
      case "source-start":
        return <SourceStartStepContent step={step} />;
      case "source-result":
        return <SourceResultStepContent step={step} />;
      case "merge":
        return <MergeStepContent step={step} />;
      case "output":
        return <OutputStepContent step={step} />;
      case "done":
        return <DoneStepContent step={step} />;
    }
  };

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
      destroyOnClose
      styles={{
        body: { maxHeight: "calc(100vh - 160px)", overflowY: "auto" },
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

      <div ref={bottomRef} />
    </Modal>
  );
});

ProxyDebugModal.displayName = "ProxyDebugModal";

export default ProxyDebugModal;
