import type { User } from "@acme/types";
import {
  ClockCircleOutlined,
  CloudServerOutlined,
  LinkOutlined,
  PlusOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Button, Spin } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { trpc } from "../../lib/trpc";

type WorkspacePageProps = {
  user: User | null;
};

export default function WorkspacePage({ user }: WorkspacePageProps) {
  const { workspace } = useParams<{ workspace: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 获取 Proxy 订阅列表
  const { data: proxyList, isLoading: isListLoading } =
    trpc.proxy.list.useQuery(undefined, {
      enabled: Boolean(user),
    });

  // 获取用户整体统计（真实数据）
  const { data: userStats, isLoading: isStatsLoading } =
    trpc.proxy.getUserStats.useQuery(undefined, {
      enabled: Boolean(user),
    });

  const isLoading = isListLoading || isStatsLoading;

  // 使用真实统计数据
  const statsData = [
    userStats?.totalSubscriptions ?? 0,
    userStats?.totalNodes ?? 0,
    userStats?.todayRequests ?? 0,
  ];

  // 快速操作
  const quickActions = [
    {
      icon: <PlusOutlined />,
      title: t("dashboard.newSubscription"),
      desc: t("dashboard.newSubscriptionDesc"),
      onClick: () => navigate(`/dashboard/${workspace}/proxy`),
    },
    {
      icon: <LinkOutlined />,
      title: t("dashboard.manageSubscriptions"),
      desc: t("dashboard.manageSubscriptionsDesc"),
      onClick: () => navigate(`/dashboard/${workspace}/proxy`),
    },
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
                    {index === 0 ? (
                      <CloudServerOutlined />
                    ) : index === 1 ? (
                      <LinkOutlined />
                    ) : (
                      <ClockCircleOutlined />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {title}
                    </p>
                    <p className="text-2xl font-semibold">{statsData[index]}</p>
                  </div>
                </div>
              </div>
            ),
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
              {t("dashboard.viewAll")} <RightOutlined />
            </Button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {t("dashboard.insightDesc")}
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : (userStats?.totalSubscriptions ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <CloudServerOutlined className="text-4xl mb-2" />
              <p>{t("dashboard.noSubscriptions")}</p>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="mt-4"
                onClick={() => navigate(`/dashboard/${workspace}/proxy`)}
              >
                {t("dashboard.createSubscription")}
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
                      <p className="font-medium truncate">
                        {sub.remark || t("dashboard.unnamedSubscription")}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {t("dashboard.createdBy")}
                        {sub.user.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {sub.lastAccessAt
                      ? new Date(sub.lastAccessAt).toLocaleDateString()
                      : t("dashboard.neverAccessed")}
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {action.desc}
                  </p>
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
