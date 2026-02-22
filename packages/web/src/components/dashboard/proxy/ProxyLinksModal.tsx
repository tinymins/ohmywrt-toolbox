import { useImperativeHandle, forwardRef, useState } from "react";
import { Modal, Typography, Space, Button, message, Tag } from "antd";
import {
  CopyOutlined,
  ExportOutlined,
  LinkOutlined,
  GlobalOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const { Text, Paragraph } = Typography;

export interface ProxyLinksModalRef {
  open: (uuid: string, remark?: string | null) => void;
}

const ProxyLinksModal = forwardRef<ProxyLinksModalRef>((_, ref) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [visible, setVisible] = useState(false);
  const [uuid, setUuid] = useState("");
  const [remark, setRemark] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: (uuid: string, remark?: string | null) => {
      setUuid(uuid);
      setRemark(remark ?? null);
      setVisible(true);
    },
  }));

  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  const clashUrl = `${baseUrl}/public/proxy/clash/${uuid}`;
  const clashMetaUrl = `${baseUrl}/public/proxy/clash/${uuid}?meta=true`;
  const singboxV11Url = `${baseUrl}/public/proxy/sing-box/${uuid}`;
  const singboxV12Url = `${baseUrl}/public/proxy/sing-box/12/${uuid}`;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      messageApi.success(t("proxy.copiedToClipboard"));
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
      {contextHolder}
      <Modal
        title={
          <Space>
            <LinkOutlined />
            <span>{t("proxy.links.title")}</span>
          </Space>
        }
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        {remark && (
          <div className="mb-4">
            <Text type="secondary">{remark}</Text>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {linkItems.map((item) => (
            <div
              key={item.key}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center justify-between mb-2">
                <Space size={8}>
                  <Tag
                    color={item.tagColor}
                    className="!mr-0"
                    style={{ fontSize: 13 }}
                  >
                    {item.icon} {item.label}
                  </Tag>
                </Space>
                <Space size={4}>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined style={{ color: "#3b82f6" }} />}
                    style={{ color: "#3b82f6" }}
                    onClick={() => handleCopy(item.url)}
                  >
                    {t("proxy.links.copy")}
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    icon={<ExportOutlined style={{ color: "#22c55e" }} />}
                    style={{ color: "#22c55e" }}
                    onClick={() => window.open(item.url)}
                  >
                    {t("proxy.links.open")}
                  </Button>
                </Space>
              </div>
              <Paragraph
                className="!mb-0 !text-xs break-all select-all"
                type="secondary"
                style={{ lineHeight: 1.6 }}
              >
                {item.url}
              </Paragraph>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
});

ProxyLinksModal.displayName = "ProxyLinksModal";

export default ProxyLinksModal;
