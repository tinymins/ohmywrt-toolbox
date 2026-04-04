import {
  BarChartOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
} from "@acme/components";
import {
  Empty,
  Modal,
  Spin,
  Statistic,
  Table,
  Tag,
} from "@acme/components";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { keepPreviousData } from "@tanstack/react-query";
import "dayjs/locale/zh-cn";
import { proxyApi } from "@/generated/rust-api";

dayjs.extend(relativeTime);

// 检测是否为移动设备
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

export interface ProxyStatsModalRef {
  open: (id: string, remark?: string | null) => void;
}

const ProxyStatsModal = forwardRef<ProxyStatsModalRef>((_, ref) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "zh" | "en";
  const isMobile = useIsMobile();

  // 根据当前语言设置 dayjs locale
  useEffect(() => {
    dayjs.locale(lang === "zh" ? "zh-cn" : "en");
  }, [lang]);

  const [visible, setVisible] = useState(false);
  const [subscribeId, setSubscribeId] = useState<string>("");
  const [subscribeRemark, setSubscribeRemark] = useState<string>("");

  const { data: stats, isLoading } = proxyApi.getStats.useQuery(
    { id: subscribeId },
    { enabled: !!subscribeId && visible, placeholderData: keepPreviousData },
  );

  const recentAccesses = stats?.recentAccesses ?? [];

  const todayAccess = useMemo(() => {
    const todayStart = dayjs().startOf("day");
    return recentAccesses.filter((a) => dayjs(a.createdAt).isAfter(todayStart)).length;
  }, [recentAccesses]);

  const lastAccessAt = useMemo(() => {
    if (recentAccesses.length === 0) return null;
    return recentAccesses[0]?.createdAt ?? null;
  }, [recentAccesses]);

  const accessByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of recentAccesses) {
      counts[a.accessType] = (counts[a.accessType] || 0) + 1;
    }
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [recentAccesses]);

  useImperativeHandle(ref, () => ({
    open: (id: string, remark?: string | null) => {
      setSubscribeId(id);
      setSubscribeRemark(
        remark || (lang === "zh" ? "未命名订阅" : "Unnamed Subscription"),
      );
      setVisible(true);
    },
  }));

  const handleClose = () => {
    setVisible(false);
    setSubscribeId("");
  };

  // 移动端访问记录列（简化版）
  const mobileAccessColumns = [
    {
      title: lang === "zh" ? "时间" : "Time",
      dataIndex: "createdAt",
      render: (text: string) => dayjs(text).format("MM-DD HH:mm"),
    },
    {
      title: lang === "zh" ? "类型" : "Type",
      dataIndex: "accessType",
      width: 80,
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          clash: "blue",
          "clash-meta": "purple",
          "sing-box": "green",
          "sing-box-v12": "cyan",
        };
        return (
          <Tag color={colorMap[type] ?? "default"} className="!m-0">
            {type.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "IP",
      dataIndex: "ip",
      ellipsis: true,
      render: (ip: string | null) => ip || "-",
    },
    {
      title: "UA",
      dataIndex: "userAgent",
      ellipsis: true,
      render: (ua: string | null) => (
        <span title={ua || undefined} className="text-xs text-slate-500">
          {ua || "-"}
        </span>
      ),
    },
  ];

  // PC端访问记录列
  const accessColumns = [
    {
      title: lang === "zh" ? "时间" : "Time",
      dataIndex: "createdAt",
      width: 180,
      render: (text: string) => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: lang === "zh" ? "类型" : "Type",
      dataIndex: "accessType",
      width: 140,
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          clash: "blue",
          "clash-meta": "purple",
          "sing-box": "green",
          "sing-box-v12": "cyan",
        };
        return (
          <Tag color={colorMap[type] ?? "default"}>{type.toUpperCase()}</Tag>
        );
      },
    },
    {
      title: lang === "zh" ? "节点数" : "Nodes",
      dataIndex: "nodeCount",
      width: 80,
      align: "center" as const,
    },
    {
      title: "IP",
      dataIndex: "ip",
      width: 140,
      ellipsis: true,
      render: (ip: string | null) => ip || "-",
    },
    {
      title: "User-Agent",
      dataIndex: "userAgent",
      ellipsis: true,
      render: (ua: string | null) => (
        <span title={ua || undefined} className="text-xs text-slate-500">
          {ua || "-"}
        </span>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <BarChartOutlined />
          <span>{lang === "zh" ? "订阅统计" : "Statistics"}</span>
          {!isMobile && (
            <span className="text-sm font-normal text-slate-500">
              - {subscribeRemark}
            </span>
          )}
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      size={isMobile ? "full" : "large"}
      destroyOnClose
    >
      <Spin spinning={isLoading}>
        {stats ? (
          <div className="space-y-4 md:space-y-6">
            {/* 移动端显示订阅名称 */}
            {isMobile && (
              <div className="text-sm text-slate-500 -mt-2">
                {subscribeRemark}
              </div>
            )}

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="text-center h-full rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <Statistic
                  title={lang === "zh" ? "总访问" : "Total"}
                  value={stats.totalAccesses}
                  prefix={<GlobalOutlined />}
                  valueStyle={isMobile ? { fontSize: 20 } : undefined}
                />
              </div>
              <div className="text-center h-full rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <Statistic
                  title={lang === "zh" ? "今日" : "Today"}
                  value={todayAccess}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={
                    isMobile
                      ? { fontSize: 20, color: "#3f8600" }
                      : { color: "#3f8600" }
                  }
                />
              </div>
              <div className="text-center h-full rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <Statistic
                  title={lang === "zh" ? "最后访问" : "Last"}
                  value={
                    lastAccessAt
                      ? dayjs(lastAccessAt).fromNow()
                      : "-"
                  }
                  valueStyle={{ fontSize: isMobile ? 14 : 16 }}
                />
              </div>
            </div>

            {/* 按类型统计 */}
            {accessByType.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {lang === "zh" ? "访问类型分布" : "Access by Type"}
                </h4>
                <div className="flex gap-2 md:gap-4 flex-wrap">
                  {accessByType.map((item) => (
                    <Tag
                      key={item.type}
                      color={item.type === "clash" ? "blue" : "green"}
                      className="px-3 md:px-4 py-1 text-sm"
                    >
                      {item.type.toUpperCase()}: {item.count}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {/* 最近访问记录 */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                {lang === "zh" ? "最近访问记录" : "Recent Access"}
              </h4>
              {recentAccesses.length > 0 ? (
                <Table
                  size="small"
                  bordered
                  pagination={{
                    defaultPageSize: 20,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    showTotal: (total) =>
                      lang === "zh"
                        ? `共 ${total} 条`
                        : `${total} records`,
                    size: "small",
                  }}
                  dataSource={recentAccesses}
                  columns={isMobile ? mobileAccessColumns : accessColumns}
                  rowKey="createdAt"
                  scroll={isMobile ? { y: 200 } : { y: 300 }}
                />
              ) : (
                <Empty
                  description={
                    lang === "zh" ? "暂无访问记录" : "No access records"
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </div>
        ) : (
          <Empty description={lang === "zh" ? "加载中..." : "Loading..."} />
        )}
      </Spin>
    </Modal>
  );
});

ProxyStatsModal.displayName = "ProxyStatsModal";

export default ProxyStatsModal;
