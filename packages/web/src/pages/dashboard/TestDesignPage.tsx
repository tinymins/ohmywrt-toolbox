import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { Lang } from "../../lib/types";

type TestDesignPageProps = {
  lang: Lang;
};

export default function TestDesignPage({ lang }: TestDesignPageProps) {
  const { workspace } = useParams<{ workspace: string }>();
  const { t } = useTranslation();
  const menuItems = t("dashboard.menu", { returnObjects: true }) as string[];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">{menuItems[3]}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-300">
          {lang === "zh" ? "设计和编写测试用例" : "Design and write test cases"}
        </p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          工作空间: {workspace}
        </p>
      </div>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{lang === "zh" ? "测试用例库" : "Test Case Library"}</h3>
          <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            {lang === "zh" ? "+ 新建用例" : "+ New Case"}
          </button>
        </div>
        <p className="text-slate-500 dark:text-slate-300">{lang === "zh" ? "共 186 条测试用例" : "186 test cases total"}</p>
      </div>
    </div>
  );
}
