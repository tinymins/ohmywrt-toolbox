import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { Lang } from "../../lib/types";

type AutomationPageProps = {
  lang: Lang;
};

export default function AutomationPage({ lang }: AutomationPageProps) {
  const { workspace } = useParams<{ workspace: string }>();
  const { t } = useTranslation();
  const menuItems = t("dashboard.menu", { returnObjects: true }) as string[];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">{menuItems[7]}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-300">
          {lang === "zh" ? "管理自动化测试脚本和资源" : "Manage automated test scripts and resources"}
        </p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          工作空间: {workspace}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: lang === "zh" ? "脚本总数" : "Total Scripts", value: "324" },
          { label: lang === "zh" ? "执行成功率" : "Success Rate", value: "94%" },
          { label: lang === "zh" ? "平均执行时间" : "Avg Duration", value: "12m" }
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
