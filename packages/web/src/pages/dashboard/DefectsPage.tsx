import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { Lang } from "../../lib/types";

type DefectsPageProps = {
  lang: Lang;
};

export default function DefectsPage({ lang }: DefectsPageProps) {
  const { workspace } = useParams<{ workspace: string }>();
  const { t } = useTranslation();
  const menuItems = t("dashboard.menu", { returnObjects: true }) as string[];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">{menuItems[5]}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-300">
          {lang === "zh" ? "跟踪缺陷和评估风险" : "Track defects and assess risks"}
        </p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          工作空间: {workspace}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: lang === "zh" ? "严重" : "Critical", value: "2", color: "bg-red-100 text-red-700 dark:bg-red-900/30" },
          { label: lang === "zh" ? "高" : "High", value: "5", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30" },
          { label: lang === "zh" ? "中" : "Medium", value: "12", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30" },
          { label: lang === "zh" ? "低" : "Low", value: "8", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30" }
        ].map((stat) => (
          <div key={stat.label} className={`card ${stat.color}`}>
            <p className="text-sm font-medium">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
