import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { Lang } from "../../lib/types";

type ExecutionPageProps = {
  lang: Lang;
};

export default function ExecutionPage({ lang }: ExecutionPageProps) {
  const { workspace } = useParams<{ workspace: string }>();
  const { t } = useTranslation();
  const menuItems = t("dashboard.menu", { returnObjects: true }) as string[];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">{menuItems[4]}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-300">
          {lang === "zh" ? "执行测试任务和查看结果" : "Execute tests and view results"}
        </p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          工作空间: {workspace}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: lang === "zh" ? "执行中" : "Running", value: "18", color: "text-blue-600 dark:text-blue-400" },
          { label: lang === "zh" ? "通过" : "Passed", value: "142", color: "text-green-600 dark:text-green-400" },
          { label: lang === "zh" ? "失败" : "Failed", value: "8", color: "text-red-600 dark:text-red-400" },
          { label: lang === "zh" ? "阻塞" : "Blocked", value: "3", color: "text-yellow-600 dark:text-yellow-400" }
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className={`mt-2 text-3xl font-semibold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
