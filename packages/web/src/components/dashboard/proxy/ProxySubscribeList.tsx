import { useState, useRef } from "react";
import { Table, Button, Space, Input, Popconfirm, Typography, message, Spin, Tooltip, Card } from "antd";
import { ExportOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, EyeOutlined, BarChartOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { trpc } from "../../../lib/trpc";
import ProxySubscribeModal, { type ProxySubscribeModalRef } from "./ProxySubscribeModal";
import ProxyPreviewModal, { type ProxyPreviewModalRef } from "./ProxyPreviewModal";
import ProxyStatsModal, { type ProxyStatsModalRef } from "./ProxyStatsModal";

const { Text } = Typography;

// 检测是否为移动设备
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useState(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  });

  return isMobile;
};

interface ProxySubscribeWithUser {
  id: string;
  userId: string;
  url: string;
  remark: string | null;
  subscribeUrl: string[];
  ruleList: Record<string, { name: string; url: string; type?: string }[]>;
  group: { name: string; type: string; proxies: string[]; readonly?: boolean }[];
  filter: string[];
  servers: unknown[];
  customConfig: unknown[];
  authorizedUserIds: string[];
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  authorizedUsers: { id: string; name: string; email: string }[];
}

export default function ProxySubscribeList() {
  const { t } = useTranslation();
  const modalRef = useRef<ProxySubscribeModalRef>(null);
  const previewModalRef = useRef<ProxyPreviewModalRef>(null);
  const statsModalRef = useRef<ProxyStatsModalRef>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const isMobile = useIsMobile();

  const { data: list, isLoading, refetch } = trpc.proxy.list.useQuery();

  const deleteMutation = trpc.proxy.delete.useMutation({
    onSuccess: () => {
      messageApi.success(t("proxy.deleteSuccess"));
      refetch();
    },
    onError: (error) => {
      messageApi.error(error.message || t("proxy.deleteFailed"));
    }
  });

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      messageApi.success(t("proxy.copiedToClipboard"));
    });
  };

  const getClashUrl = (uuid: string) => {
    return `${window.location.protocol}//${window.location.host}/public/proxy/clash/${uuid}`;
  };

  const getSingboxUrl = (uuid: string) => {
    return `${window.location.protocol}//${window.location.host}/public/proxy/sing-box/${uuid}`;
  };

  return (
    <div className="p-4 md:p-6">
      {contextHolder}
      <ProxySubscribeModal ref={modalRef} onSuccess={refetch} />
      <ProxyPreviewModal ref={previewModalRef} />
      <ProxyStatsModal ref={statsModalRef} />

      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={4} className="!mb-0 !text-lg md:!text-xl">
          {t("proxy.title")}
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => modalRef.current?.open()}
          size={isMobile ? "middle" : "middle"}
        >
          <span className="hidden sm:inline">{t("proxy.newSubscribe")}</span>
        </Button>
      </div>

      <Spin spinning={isLoading}>
        {/* Mobile Card View */}
        {isMobile ? (
          <div className="space-y-4">
            {(list ?? []).map((record) => (
              <Card key={record.id} size="small" className="shadow-sm">
                <div className="space-y-3">
                  {/* Header: Creator & Remark */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Text strong>{record.remark || t("proxy.preview.unnamed")}</Text>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {record.user.name} · {dayjs(record.updatedAt).format("MM-DD HH:mm")}
                      </div>
                    </div>
                  </div>

                  {/* Clash URL */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Clash</div>
                    <Input
                      size="small"
                      readOnly
                      value={getClashUrl(record.url)}
                      onClick={(e) => e.currentTarget.select()}
                      addonAfter={
                        <Space size={8}>
                          <CopyOutlined
                            className="cursor-pointer"
                            style={{ color: "#3b82f6" }}
                            onClick={() => handleCopyUrl(getClashUrl(record.url))}
                          />
                          <ExportOutlined
                            className="cursor-pointer"
                            style={{ color: "#22c55e" }}
                            onClick={() => window.open(getClashUrl(record.url))}
                          />
                        </Space>
                      }
                    />
                  </div>

                  {/* Sing-box URL */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Sing-box</div>
                    <Input
                      size="small"
                      readOnly
                      value={getSingboxUrl(record.url)}
                      onClick={(e) => e.currentTarget.select()}
                      addonAfter={
                        <Space size={8}>
                          <CopyOutlined
                            className="cursor-pointer"
                            style={{ color: "#3b82f6" }}
                            onClick={() => handleCopyUrl(getSingboxUrl(record.url))}
                          />
                          <ExportOutlined
                            className="cursor-pointer"
                            style={{ color: "#22c55e" }}
                            onClick={() => window.open(getSingboxUrl(record.url))}
                          />
                        </Space>
                      }
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Button
                      type="text"
                      size="small"
                      icon={<BarChartOutlined />}
                      onClick={() => statsModalRef.current?.open(record.id, record.remark)}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => previewModalRef.current?.open(record.id, record.remark)}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => modalRef.current?.open(record.id)}
                    />
                    <Popconfirm
                      title={t("proxy.confirmDelete")}
                      description={t("proxy.confirmDeleteDesc")}
                      onConfirm={() => deleteMutation.mutate({ id: record.id })}
                      okText={t("proxy.common.confirm")}
                      cancelText={t("proxy.common.cancel")}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        loading={deleteMutation.isPending}
                      />
                    </Popconfirm>
                  </div>
                </div>
              </Card>
            ))}
            {(list ?? []).length === 0 && (
              <div className="text-center text-gray-500 py-8">
                {t("proxy.preview.noNodes")}
              </div>
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <Table
          rowKey="id"
          size="small"
          bordered
          pagination={false}
          dataSource={list ?? []}
          scroll={{ x: 800 }}
          columns={[
            {
              title: t("proxy.columns.creator"),
              dataIndex: ["user", "name"],
              width: 100,
              ellipsis: true
            },
            {
              title: t("proxy.columns.remark"),
              dataIndex: "remark",
              width: 150,
              ellipsis: true,
              render: (text) => text || "-"
            },
            {
              title: t("proxy.columns.clashUrl"),
              dataIndex: "url",
              render: (uuid: string) => {
                const url = getClashUrl(uuid);
                return (
                  <Input
                    readOnly
                    value={url}
                    onClick={(e) => e.currentTarget.select()}
                    addonAfter={
                      <Space size={12}>
                        <CopyOutlined
                          className="cursor-pointer"
                          style={{ color: "#3b82f6" }}
                          onClick={() => handleCopyUrl(url)}
                        />
                        <ExportOutlined
                          className="cursor-pointer"
                          style={{ color: "#22c55e" }}
                          onClick={() => window.open(url)}
                        />
                      </Space>
                    }
                  />
                );
              }
            },
            {
              title: t("proxy.columns.singboxUrl"),
              dataIndex: "url",
              render: (uuid: string) => {
                const url = getSingboxUrl(uuid);
                return (
                  <Input
                    readOnly
                    value={url}
                    onClick={(e) => e.currentTarget.select()}
                    addonAfter={
                      <Space size={12}>
                        <CopyOutlined
                          className="cursor-pointer"
                          style={{ color: "#3b82f6" }}
                          onClick={() => handleCopyUrl(url)}
                        />
                        <ExportOutlined
                          className="cursor-pointer"
                          style={{ color: "#22c55e" }}
                          onClick={() => window.open(url)}
                        />
                      </Space>
                    }
                  />
                );
              }
            },
            {
              title: t("proxy.columns.lastUpdate"),
              dataIndex: "updatedAt",
              width: 160,
              render: (text: string) => dayjs(text).format("YYYY-MM-DD HH:mm:ss")
            },
            {
              title: t("proxy.columns.actions"),
              align: "center",
              width: 160,
              fixed: "right",
              render: (_, record) => (
                <Space size="middle">
                  <Tooltip title={t("proxy.actions.stats")}>
                    <Button
                      type="link"
                      size="small"
                      icon={<BarChartOutlined />}
                      onClick={() => statsModalRef.current?.open(record.id, record.remark)}
                    />
                  </Tooltip>
                  <Tooltip title={t("proxy.actions.preview")}>
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => previewModalRef.current?.open(record.id, record.remark)}
                    />
                  </Tooltip>
                  <Tooltip title={t("proxy.actions.edit")}>
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => modalRef.current?.open(record.id)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title={t("proxy.confirmDelete")}
                    description={t("proxy.confirmDeleteDesc")}
                    onConfirm={() => deleteMutation.mutate({ id: record.id })}
                    okText={t("proxy.common.confirm")}
                    cancelText={t("proxy.common.cancel")}
                  >
                    <Tooltip title={t("proxy.actions.delete")}>
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        loading={deleteMutation.isPending}
                      />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              )
            }
          ]}
          />
        )}
      </Spin>
    </div>
  );
}
