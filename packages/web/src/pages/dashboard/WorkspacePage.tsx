import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Spin } from "antd";
import { PlusOutlined, RightOutlined, CloudServerOutlined, LinkOutlined, ClockCircleOutlined } from "@ant-design/icons";
import type { User } from "@acme/types";
import { trpc } from "../../lib/trpc";

type WorkspacePageProps = {
  user: User | null;
};

export default function WorkspacePage({ user }: WorkspacePageProps) {
  const { workspace } = useParams<{ workspace: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "zh" | "en";

  // 获取 Proxy 订阅列表
  const { data: proxyList, isLoading } = trpc.proxy.list.useQuery(undefined, {
    enabled: Boolean(user),
  });

  // 计算统计数据
  const subscriptionCount = proxyList?.length ?? 0;
  const totalNodes = proxyList?.reduce((sum, sub) => {
    // servers 是 JSONC 字符串，需要解析
    try {
      const servers = sub.servers ? JSON.parse(sub.servers) : [];
      return sum + (Array.isArray(servers) ? servers.length : 0);
    } catch {
      return sum;
    }
  }, 0) ?? 0;
  const recentlyAccessed = proxyList?.filter(sub => {
    if (!sub.lastAccessAt) return false;
    const accessTime = new Date(sub.lastAccessAt).getTime();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return accessTime > oneDayAgo;
  }).length ?? 0;

  const statsData = [subscriptionCount, totalNodes, recentlyAccessed];

  // 快速操作
  const quickActions = [
    {
      icon: <PlusOutlined />,
      title: lang === "zh" ? "新建订阅" : "New Subscription",
      desc: lang === "zh" ? "创建新的代理订阅配置" : "Create a new proxy subscription",
      onClick: () => navigate(`/dashboard/${workspace}/proxy`)
    },
    {
      icon: <LinkOutlined />,
      title: lang === "zh" ? "管理订阅" : "Manage Subscriptions",
      desc: lang === "zh" ? "查看和编辑所有订阅" : "View and edit all subscriptions",
      onClick: () => navigate(`/dashboard/${workspace}/proxy`)
    }
  ];

  return (
    <div className="space-y-6">
      {/* 欢迎卡片 */}
      <div className="card">
        <h2 className="text-2xl font-semibold">{t("dashboard.title")}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-300">
          {t("dashboard.welcome")}，{user?.name || user?.email}
        </p>
      </div>

      {/* 统计卡片 */}
      <Spin spinning={isLoading}>
        <div className="grid gap-6 md:grid-cols-3">
          {(t("dashboard.stats", { returnObjects: true }) as string[]).map(
            (title, index) => (
              <div key={title} className="card">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                    {index === 0 ? <CloudServerOutlined /> : index === 1 ? <LinkOutlined /> : <ClockCircleOutlined />}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {title}
                    </p>
                    <p className="text-2xl font-semibold">
                      {statsData[index]}
                    </p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </Spin>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Proxy 概况 */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {t("dashboard.insightTitle")}
            </h3>
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/dashboard/${workspace}/proxy`)}
            >
              {lang === "zh" ? "查看全部" : "View All"} <RightOutlined />
            </Button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {t("dashboard.insightDesc")}
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : subscriptionCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <CloudServerOutlined className="text-4xl mb-2" />
              <p>{lang === "zh" ? "暂无订阅" : "No subscriptions yet"}</p>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="mt-4"
                onClick={() => navigate(`/dashboard/${workspace}/proxy`)}
              >
                {lang === "zh" ? "创建订阅" : "Create Subscription"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {proxyList?.slice(0, 4).map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                      <CloudServerOutlined />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{sub.remark || (lang === "zh" ? "未命名订阅" : "Unnamed Subscription")}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {lang === "zh" ? "创建者：" : "By: "}{sub.user.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {sub.lastAccessAt
                      ? new Date(sub.lastAccessAt).toLocaleDateString()
                      : lang === "zh" ? "从未访问" : "Never accessed"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 快速操作 */}
        <div className="card space-y-4">
          <h3 className="text-lg font-semibold">
            {t("dashboard.assistantTitle")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {t("dashboard.assistantDesc")}
          </p>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.title}
                type="button"
                onClick={action.onClick}
                className="flex w-full items-center gap-4 rounded-lg border border-slate-200 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                  {action.icon}
                </div>
                <div>
                  <p className="font-medium">{action.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{action.desc}</p>
                </div>
                <RightOutlined className="ml-auto text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
