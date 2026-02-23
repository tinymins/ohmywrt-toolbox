import {
  BarChartOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LinkOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  message,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "../../../lib/trpc";
import ProxyLinksModal, { type ProxyLinksModalRef } from "./ProxyLinksModal";
import ProxyPreviewModal, {
  type ProxyPreviewModalRef,
} from "./ProxyPreviewModal";
import ProxyStatsModal, { type ProxyStatsModalRef } from "./ProxyStatsModal";
import ProxySubscribeModal, {
  type ProxySubscribeModalRef,
} from "./ProxySubscribeModal";

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
  group: {
    name: string;
    type: string;
    proxies: string[];
    readonly?: boolean;
  }[];
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
  const linksModalRef = useRef<ProxyLinksModalRef>(null);
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
    },
  });

  return (
    <div>
      {contextHolder}
      <ProxySubscribeModal ref={modalRef} onSuccess={refetch} />
      <ProxyPreviewModal ref={previewModalRef} />
      <ProxyStatsModal ref={statsModalRef} />
      <ProxyLinksModal ref={linksModalRef} />

      <div className="flex justify-between items-center mb-3 md:mb-4">
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
          <div className="flex flex-col gap-3 -mx-6">
            {(list ?? []).map((record) => (
              <Card
                key={record.id}
                size="small"
                className="!rounded-none !border-x-0 !shadow-none"
                styles={{ body: { padding: "12px 24px" } }}
              >
                <div className="space-y-2.5">
                  {/* Header: Creator & Remark */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Text strong>
                        {record.remark || t("proxy.preview.unnamed")}
                      </Text>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {record.user.name} ·{" "}
                        {dayjs(record.updatedAt).format("MM-DD HH:mm")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Tag color="blue">
                        {t("proxy.columns.nodeCount")}: {record.cachedNodeCount}
                      </Tag>
                      <Tag color="green">
                        {t("proxy.columns.accessCount")}:{" "}
                        {record.totalAccessCount}
                      </Tag>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Button
                      type="link"
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() =>
                        linksModalRef.current?.open(
                          record.url,
                          record.remark,
                          record.id,
                        )
                      }
                    />
                    <Button
                      type="link"
                      size="small"
                      icon={<BarChartOutlined />}
                      onClick={() =>
                        statsModalRef.current?.open(record.id, record.remark)
                      }
                    />
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() =>
                        previewModalRef.current?.open(record.id, record.remark)
                      }
                    />
                    <Button
                      type="link"
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
                        type="link"
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
                ellipsis: true,
              },
              {
                title: t("proxy.columns.remark"),
                dataIndex: "remark",
                width: 150,
                ellipsis: true,
                render: (text) => text || "-",
              },
              {
                title: t("proxy.columns.nodeCount"),
                dataIndex: "cachedNodeCount",
                width: 90,
                align: "center",
                render: (val: number) => <Tag color="blue">{val}</Tag>,
              },
              {
                title: t("proxy.columns.accessCount"),
                dataIndex: "totalAccessCount",
                width: 90,
                align: "center",
                render: (val: number) => <Tag color="green">{val}</Tag>,
              },
              {
                title: t("proxy.columns.lastUpdate"),
                dataIndex: "updatedAt",
                width: 160,
                align: "center",
                render: (text: string) =>
                  dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
              },
              {
                title: t("proxy.columns.actions"),
                align: "center",
                width: 200,
                fixed: "right",
                render: (_, record) => (
                  <Space size="middle">
                    <Tooltip title={t("proxy.links.title")}>
                      <Button
                        type="link"
                        size="small"
                        icon={<LinkOutlined />}
                        onClick={() =>
                          linksModalRef.current?.open(
                            record.url,
                            record.remark,
                            record.id,
                          )
                        }
                      />
                    </Tooltip>
                    <Tooltip title={t("proxy.actions.stats")}>
                      <Button
                        type="link"
                        size="small"
                        icon={<BarChartOutlined />}
                        onClick={() =>
                          statsModalRef.current?.open(record.id, record.remark)
                        }
                      />
                    </Tooltip>
                    <Tooltip title={t("proxy.actions.preview")}>
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() =>
                          previewModalRef.current?.open(
                            record.id,
                            record.remark,
                          )
                        }
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
                ),
              },
            ]}
          />
        )}
      </Spin>
    </div>
  );
}
