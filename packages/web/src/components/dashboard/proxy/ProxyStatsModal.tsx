import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Modal, Spin, Table, Tag, Statistic, Row, Col, Card, Empty } from "antd";
import { BarChartOutlined, CloudServerOutlined, ClockCircleOutlined, GlobalOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { trpc } from "../../../lib/trpc";

dayjs.extend(relativeTime);

export interface ProxyStatsModalRef {
  open: (id: string, remark?: string | null) => void;
}

const ProxyStatsModal = forwardRef<ProxyStatsModalRef>((_, ref) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "zh" | "en";

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
      ellipsis: true,
      render: (ip: string | null) => ip || "-"
    }
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <BarChartOutlined />
          <span>{lang === "zh" ? "订阅统计" : "Subscription Statistics"}</span>
          <span className="text-sm font-normal text-slate-500">- {subscribeRemark}</span>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Spin spinning={isLoading}>
        {stats ? (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small" className="text-center h-full">
                  <Statistic
                    title={lang === "zh" ? "总访问次数" : "Total Access"}
                    value={stats.totalAccess}
                    prefix={<GlobalOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" className="text-center h-full">
                  <Statistic
                    title={lang === "zh" ? "今日访问" : "Today"}
                    value={stats.todayAccess}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: "#3f8600" }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" className="text-center h-full">
                  <Statistic
                    title={lang === "zh" ? "活跃节点" : "Active Nodes"}
                    value={stats.cachedNodeCount}
                    prefix={<CloudServerOutlined />}
                    valueStyle={{ color: "#1677ff" }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" className="text-center h-full">
                  <Statistic
                    title={lang === "zh" ? "最后访问" : "Last Access"}
                    value={stats.lastAccessAt ? dayjs(stats.lastAccessAt).fromNow() : "-"}
                    valueStyle={{ fontSize: 16 }}
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
                <div className="flex gap-4">
                  {stats.accessByType.map((item) => (
                    <Tag
                      key={item.type}
                      color={item.type === "clash" ? "blue" : "green"}
                      className="px-4 py-1 text-sm"
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
                  columns={accessColumns}
                  rowKey="createdAt"
                  scroll={{ y: 300 }}
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
