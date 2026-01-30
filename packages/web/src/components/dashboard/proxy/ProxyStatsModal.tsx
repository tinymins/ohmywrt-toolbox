import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Modal, Spin, Table, Tag, Statistic, Row, Col, Card, Empty } from "antd";
import { BarChartOutlined, CloudServerOutlined, ClockCircleOutlined, GlobalOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { trpc } from "../../../lib/trpc";

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

  const { data: stats, isLoading } = trpc.proxy.getStats.useQuery(
    { id: subscribeId },
    { enabled: !!subscribeId && visible }
  );

  useImperativeHandle(ref, () => ({
    open: (id: string, remark?: string | null) => {
      setSubscribeId(id);
      setSubscribeRemark(remark || (lang === "zh" ? "未命名订阅" : "Unnamed Subscription"));
      setVisible(true);
    }
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
      render: (text: string) => dayjs(text).format("MM-DD HH:mm")
    },
    {
      title: lang === "zh" ? "类型" : "Type",
      dataIndex: "accessType",
      width: 80,
      render: (type: string) => (
        <Tag color={type === "clash" ? "blue" : "green"} className="!m-0">
          {type.toUpperCase()}
        </Tag>
      )
    },
    {
      title: "IP",
      dataIndex: "ip",
      ellipsis: true,
      render: (ip: string | null) => ip || "-"
    }
  ];

  // PC端访问记录列
  const accessColumns = [
    {
      title: lang === "zh" ? "时间" : "Time",
      dataIndex: "createdAt",
      width: 180,
      render: (text: string) => dayjs(text).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      title: lang === "zh" ? "类型" : "Type",
      dataIndex: "accessType",
      width: 100,
      render: (type: string) => (
        <Tag color={type === "clash" ? "blue" : "green"}>
          {type.toUpperCase()}
        </Tag>
      )
    },
    {
      title: lang === "zh" ? "节点数" : "Nodes",
      dataIndex: "nodeCount",
      width: 80,
      align: "center" as const
    },
    {
      title: "IP",
      dataIndex: "ip",
      width: 140,
      ellipsis: true,
      render: (ip: string | null) => ip || "-"
    }
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <BarChartOutlined />
          <span>{lang === "zh" ? "订阅统计" : "Statistics"}</span>
          {!isMobile && (
            <span className="text-sm font-normal text-slate-500">- {subscribeRemark}</span>
          )}
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={isMobile ? "100%" : 800}
      style={isMobile ? { top: 20, maxWidth: "100%", margin: "0 auto", padding: "0 8px" } : undefined}
      destroyOnClose
    >
      <Spin spinning={isLoading}>
        {stats ? (
          <div className="space-y-4 md:space-y-6">
            {/* 移动端显示订阅名称 */}
            {isMobile && (
              <div className="text-sm text-slate-500 -mt-2">{subscribeRemark}</div>
            )}

            {/* 统计卡片 */}
            <Row gutter={[8, 8]}>
              <Col span={isMobile ? 12 : 6}>
                <Card size="small" className="text-center h-full">
                  <Statistic
                    title={lang === "zh" ? "总访问" : "Total"}
                    value={stats.totalAccess}
                    prefix={<GlobalOutlined />}
                    valueStyle={isMobile ? { fontSize: 20 } : undefined}
                  />
                </Card>
              </Col>
              <Col span={isMobile ? 12 : 6}>
                <Card size="small" className="text-center h-full">
                  <Statistic
                    title={lang === "zh" ? "今日" : "Today"}
                    value={stats.todayAccess}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={isMobile ? { fontSize: 20, color: "#3f8600" } : { color: "#3f8600" }}
                  />
                </Card>
              </Col>
              <Col span={isMobile ? 12 : 6}>
                <Card size="small" className="text-center h-full">
                  <Statistic
                    title={lang === "zh" ? "活跃节点" : "Nodes"}
                    value={stats.cachedNodeCount}
                    prefix={<CloudServerOutlined />}
                    valueStyle={isMobile ? { fontSize: 20, color: "#1677ff" } : { color: "#1677ff" }}
                  />
                </Card>
              </Col>
              <Col span={isMobile ? 12 : 6}>
                <Card size="small" className="text-center h-full">
                  <Statistic
                    title={lang === "zh" ? "最后访问" : "Last"}
                    value={stats.lastAccessAt ? dayjs(stats.lastAccessAt).fromNow() : "-"}
                    valueStyle={{ fontSize: isMobile ? 14 : 16 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 按类型统计 */}
            {stats.accessByType.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {lang === "zh" ? "访问类型分布" : "Access by Type"}
                </h4>
                <div className="flex gap-2 md:gap-4 flex-wrap">
                  {stats.accessByType.map((item) => (
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
              {stats.recentAccess.length > 0 ? (
                <Table
                  size="small"
                  bordered
                  pagination={false}
                  dataSource={stats.recentAccess}
                  columns={isMobile ? mobileAccessColumns : accessColumns}
                  rowKey="createdAt"
                  scroll={isMobile ? { y: 200 } : { x: 500, y: 300 }}
                />
              ) : (
                <Empty
                  description={lang === "zh" ? "暂无访问记录" : "No access records"}
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
