import {
  BarChartOutlined,
  Button,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LinkOutlined,
  PlusOutlined,
  Popconfirm,
  Spin,
  Table,
  Tag,
  Tooltip,
} from "@acme/components";
import dayjs from "dayjs";
import { Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { proxyApi } from "@/generated/rust-api";
import { message } from "@/lib/message";
import ProxyLinksModal, { type ProxyLinksModalRef } from "./ProxyLinksModal";
import ProxyPreviewModal, {
  type ProxyPreviewModalRef,
} from "./ProxyPreviewModal";
import ProxyStatsModal, { type ProxyStatsModalRef } from "./ProxyStatsModal";
import ProxySubscribeModal, {
  type ProxySubscribeModalRef,
} from "./ProxySubscribeModal";

// 检测是否为移动设备
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  const isMobile = useIsMobile();

  const { data: list, isLoading, refetch } = proxyApi.list.useQuery();

  const deleteMutation = proxyApi.delete.useMutation({
    onSuccess: () => {
      message.success(t("proxy.deleteSuccess"));
      refetch();
    },
    onError: (error) => {
      message.error(error.message || t("proxy.deleteFailed"));
    },
  });

  return (
    <div>
      <ProxySubscribeModal ref={modalRef} onSuccess={refetch} />
      <ProxyPreviewModal ref={previewModalRef} />
      <ProxyStatsModal ref={statsModalRef} />
      <ProxyLinksModal ref={linksModalRef} />

      {/* Intro Banner — hidden on mobile */}
      <div className="mb-5 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 dark:border-blue-800/30 dark:from-blue-950/20 dark:to-cyan-950/20 hidden md:block">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 dark:bg-blue-500/25">
            <Share2 className="text-blue-600 dark:text-blue-400" size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
              {t("proxy.intro.headline")}
            </h3>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {t("proxy.intro.description")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-3 md:mb-4">
        <h4 className="mb-0 text-lg md:text-xl">{t("proxy.intro.headline")}</h4>
        <Button
          variant="primary"
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
          <div className="flex flex-col gap-3">
            {(list ?? []).map((record) => (
              <div
                key={record.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Card body */}
                <div className="px-3 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-base truncate">
                      {record.remark || t("proxy.preview.unnamed")}
                    </span>
                    <div className="flex gap-1.5 shrink-0">
                      <Tag color="blue" className="!text-xs">
                        {t("proxy.columns.nodeCount")}: {record.cachedNodeCount}
                      </Tag>
                      <Tag color="green" className="!text-xs">
                        {t("proxy.columns.accessCount")}:{" "}
                        {(record as ProxySubscribeWithUser).totalAccessCount ??
                          "-"}
                      </Tag>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {(record as ProxySubscribeWithUser).user?.name ?? "-"} ·{" "}
                    {dayjs(record.updatedAt).format("MM-DD HH:mm")}
                  </div>
                </div>

                {/* Action bar — 5 equal sections divided by borders */}
                <div className="flex border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() =>
                      linksModalRef.current?.open(
                        record.url,
                        record.remark,
                        record.id,
                      )
                    }
                  >
                    <LinkOutlined className="w-3.5 h-3.5" />
                    链接
                  </button>
                  <div className="w-px bg-gray-200 dark:bg-gray-700" />
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() =>
                      statsModalRef.current?.open(record.id, record.remark)
                    }
                  >
                    <BarChartOutlined className="w-3.5 h-3.5" />
                    统计
                  </button>
                  <div className="w-px bg-gray-200 dark:bg-gray-700" />
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() =>
                      previewModalRef.current?.open(record.id, record.remark)
                    }
                  >
                    <EyeOutlined className="w-3.5 h-3.5" />
                    预览
                  </button>
                  <div className="w-px bg-gray-200 dark:bg-gray-700" />
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => modalRef.current?.open(record.id)}
                  >
                    <EditOutlined className="w-3.5 h-3.5" />
                    编辑
                  </button>
                  <div className="w-px bg-gray-200 dark:bg-gray-700" />
                  <Popconfirm
                    title={t("proxy.confirmDelete")}
                    description={t("proxy.confirmDeleteDesc")}
                    onConfirm={() => deleteMutation.mutate({ id: record.id })}
                    okText={t("proxy.common.confirm")}
                    cancelText={t("proxy.common.cancel")}
                  >
                    <button
                      type="button"
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 transition-colors cursor-pointer"
                    >
                      <DeleteOutlined className="w-3.5 h-3.5" />
                      删除
                    </button>
                  </Popconfirm>
                </div>
              </div>
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
            size="middle"
            bordered
            pagination={false}
            dataSource={list ?? []}
            scroll={{ x: 900 }}
            columns={[
              {
                title: t("proxy.columns.creator"),
                width: 100,
                ellipsis: true,
                render: (_, record) => (record as any).user?.name ?? "-",
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
                render: (val: number) => <Tag color="green">{val ?? "-"}</Tag>,
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
                  <div className="flex gap-4 items-center justify-center">
                    <Tooltip title={t("proxy.links.title")}>
                      <Button
                        variant="link"
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
                        variant="link"
                        size="small"
                        icon={<BarChartOutlined />}
                        onClick={() =>
                          statsModalRef.current?.open(record.id, record.remark)
                        }
                      />
                    </Tooltip>
                    <Tooltip title={t("proxy.actions.preview")}>
                      <Button
                        variant="link"
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
                        variant="link"
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
                          variant="link"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          loading={deleteMutation.isPending}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Spin>
    </div>
  );
}
