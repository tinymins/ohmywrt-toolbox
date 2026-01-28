import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { Lang } from "../../lib/types";

type RequirementsPageProps = {
  lang: Lang;
};

export default function RequirementsPage({ lang }: RequirementsPageProps) {
  const { workspace } = useParams<{ workspace: string }>();
  const { t } = useTranslation();
  const menuItems = t("dashboard.menu", { returnObjects: true }) as string[];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">{menuItems[1]}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-300">
          {lang === "zh" ? "管理和跟踪产品需求" : "Manage and track product requirements"}
        </p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          工作空间: {workspace}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: lang === "zh" ? "待分析" : "To Analyze", count: 12, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
          { title: lang === "zh" ? "设计中" : "In Design", count: 8, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
          { title: lang === "zh" ? "已完成" : "Completed", count: 45, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" }
        ].map((item) => (
          <div key={item.title} className={`card ${item.color}`}>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-2 text-4xl font-bold">{item.count}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">{lang === "zh" ? "最近需求" : "Recent Requirements"}</h3>
        <div className="space-y-3">
          {[
            { id: "REQ-1024", title: lang === "zh" ? "用户登录模块优化" : "User login optimization", status: lang === "zh" ? "待分析" : "To Analyze" },
            { id: "REQ-1023", title: lang === "zh" ? "支付接口升级" : "Payment API upgrade", status: lang === "zh" ? "设计中" : "In Design" },
            { id: "REQ-1022", title: lang === "zh" ? "订单查询性能优化" : "Order query optimization", status: lang === "zh" ? "已完成" : "Completed" }
          ].map((req) => (
            <div key={req.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">{req.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{req.id}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800">{req.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
