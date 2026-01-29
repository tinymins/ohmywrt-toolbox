import { useState, useRef } from "react";
import { Table, Button, Space, Input, Popconfirm, Typography, message, Spin, Tooltip } from "antd";
import { ExportOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, EyeOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { trpc } from "../../../lib/trpc";
import ProxySubscribeModal, { type ProxySubscribeModalRef } from "./ProxySubscribeModal";
import ProxyPreviewModal, { type ProxyPreviewModalRef } from "./ProxyPreviewModal";

const { Text } = Typography;

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
  const [messageApi, contextHolder] = message.useMessage();

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
    <div className="p-6">
      {contextHolder}
      <ProxySubscribeModal ref={modalRef} onSuccess={refetch} />
      <ProxyPreviewModal ref={previewModalRef} />

      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={3} className="!mb-0">
          {t("proxy.title")}
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => modalRef.current?.open()}
        >
          {t("proxy.newSubscribe")}
        </Button>
      </div>

      <Spin spinning={isLoading}>
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
              width: 120,
              fixed: "right",
              render: (_, record) => (
                <Space size="middle">
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
      </Spin>
    </div>
  );
}
