import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { Lang } from "../../lib/types";

type TestPlanPageProps = {
  lang: Lang;
};

export default function TestPlanPage({ lang }: TestPlanPageProps) {
  const { workspace } = useParams<{ workspace: string }>();
  const { t } = useTranslation();
  const menuItems = t("dashboard.menu", { returnObjects: true }) as string[];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">{menuItems[2]}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-300">
          {lang === "zh" ? "规划和管理测试计划" : "Plan and manage test plans"}
        </p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          工作空间: {workspace}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: lang === "zh" ? "进行中" : "In Progress", value: "5" },
          { label: lang === "zh" ? "本周完成" : "Completed This Week", value: "12" },
          { label: lang === "zh" ? "平均覆盖率" : "Avg Coverage", value: "87%" }
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
