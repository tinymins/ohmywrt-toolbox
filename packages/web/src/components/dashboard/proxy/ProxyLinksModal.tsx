import {
  ApiOutlined,
  BugOutlined,
  Button,
  CopyOutlined,
  DeleteOutlined,
  ExportOutlined,
  GlobalOutlined,
  LinkOutlined,
  Modal,
  Tag,
} from "@acme/components";
import type { ProxyDebugFormat } from "@acme/types";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { proxyApi } from "@/generated/rust-api";
import { useIsMobile } from "@/hooks";
import { message } from "@/lib/message";
import ProxyDebugModal, { type ProxyDebugModalRef } from "./ProxyDebugModal";

/** Map link item key to debug format */
const DEBUG_FORMAT_MAP: Record<string, ProxyDebugFormat> = {
  clash: "clash",
  clashMeta: "clash-meta",
  "singbox-v11": "sing-box",
  "singbox-v12": "sing-box-v12",
};

export interface ProxyLinksModalRef {
  open: (uuid: string, remark?: string | null, subscribeId?: string) => void;
}

const ProxyLinksModal = forwardRef<ProxyLinksModalRef>((_, ref) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [uuid, setUuid] = useState("");
  const [remark, setRemark] = useState<string | null>(null);
  const [subscribeId, setSubscribeId] = useState<string>("");
  const debugModalRef = useRef<ProxyDebugModalRef>(null);

  const isMobile = useIsMobile();

  const clearCacheMutation = proxyApi.clearCache.useMutation({
    onSuccess: () => message.success(t("proxy.links.cacheClearedSuccess")),
  });

  useImperativeHandle(ref, () => ({
    open: (uuid: string, remark?: string | null, subscribeId?: string) => {
      setUuid(uuid);
      setRemark(remark ?? null);
      setSubscribeId(subscribeId ?? "");
      setVisible(true);
    },
  }));

  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  const clashUrl = `${baseUrl}/api/public/proxy/${uuid}/clash`;
  const clashMetaUrl = `${baseUrl}/api/public/proxy/${uuid}/clash-meta`;
  const singboxV11Url = `${baseUrl}/api/public/proxy/${uuid}/sing-box`;
  const singboxV12Url = `${baseUrl}/api/public/proxy/${uuid}/sing-box/12`;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      message.success(t("proxy.copiedToClipboard"));
    });
  };

  const linkItems = [
    {
      key: "clash",
      label: "Clash",
      icon: <GlobalOutlined />,
      color: "#3b82f6",
      tagColor: "blue",
      url: clashUrl,
    },
    {
      key: "clashMeta",
      label: "Clash Meta",
      icon: <ApiOutlined />,
      color: "#8b5cf6",
      tagColor: "purple",
      url: clashMetaUrl,
    },
    {
      key: "singbox-v11",
      label: "Sing-box v1.11",
      icon: <LinkOutlined />,
      color: "#10b981",
      tagColor: "green",
      url: singboxV11Url,
    },
    {
      key: "singbox-v12",
      label: "Sing-box v1.12",
      icon: <LinkOutlined />,
      color: "#059669",
      tagColor: "cyan",
      url: singboxV12Url,
    },
  ];

  return (
    <>
      <ProxyDebugModal ref={debugModalRef} />
      <Modal
        title={
          <div className="flex gap-2 items-center">
            <LinkOutlined />
            <span>{t("proxy.links.title")}</span>
          </div>
        }
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={isMobile ? undefined : 560}
        size={isMobile ? "full" : undefined}
        destroyOnClose
      >
        {remark && (
          <div className="mb-4">
            <span className="text-slate-500">{remark}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {linkItems.map((item) => (
            <div
              key={item.key}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-2 items-center">
                  <Tag
                    color={item.tagColor}
                    className="!mr-0"
                    style={{ fontSize: 13 }}
                  >
                    {item.icon} {item.label}
                  </Tag>
                </div>
                <div className="flex gap-1 items-center">
                  <Button
                    variant="text"
                    size="small"
                    icon={<CopyOutlined style={{ color: "#3b82f6" }} />}
                    style={{ color: "#3b82f6" }}
                    onClick={() => handleCopy(item.url)}
                  >
                    {t("proxy.links.copy")}
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    icon={<ExportOutlined style={{ color: "#22c55e" }} />}
                    style={{ color: "#22c55e" }}
                    onClick={() => window.open(item.url)}
                  >
                    {t("proxy.links.open")}
                  </Button>
                  {subscribeId && (
                    <Button
                      variant="text"
                      size="small"
                      icon={<BugOutlined style={{ color: "#f59e0b" }} />}
                      style={{ color: "#f59e0b" }}
                      onClick={() =>
                        debugModalRef.current?.open(
                          subscribeId,
                          DEBUG_FORMAT_MAP[item.key],
                        )
                      }
                    >
                      {t("proxy.links.debug")}
                    </Button>
                  )}
                </div>
              </div>
              <p
                className="mb-0 text-xs break-all select-all text-slate-500"
                style={{ lineHeight: 1.6 }}
              >
                {item.url}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
            {t("proxy.links.tools")}
          </h4>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <Button
              variant="outline"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => clearCacheMutation.mutate(undefined)}
              loading={clearCacheMutation.isPending}
            >
              {t("proxy.links.clearCache")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

ProxyLinksModal.displayName = "ProxyLinksModal";

export default ProxyLinksModal;
