import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { Lang } from "../../lib/types";

type ReportsPageProps = {
  lang: Lang;
};

export default function ReportsPage({ lang }: ReportsPageProps) {
  const { workspace } = useParams<{ workspace: string }>();
  const { t } = useTranslation();
  const menuItems = t("dashboard.menu", { returnObjects: true }) as string[];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">{menuItems[6]}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-300">
          {lang === "zh" ? "查看质量指标和生成报告" : "View quality metrics and generate reports"}
        </p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          工作空间: {workspace}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: lang === "zh" ? "测试覆盖率" : "Test Coverage", value: "92%", trend: "+5%" },
          { label: lang === "zh" ? "缺陷密度" : "Defect Density", value: "0.8", trend: "-12%" },
          { label: lang === "zh" ? "自动化率" : "Automation Rate", value: "78%", trend: "+8%" }
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-semibold">{stat.value}</p>
              <span className="text-sm text-green-600 dark:text-green-400">{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
