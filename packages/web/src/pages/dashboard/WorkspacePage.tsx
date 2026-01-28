import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { User } from "@acme/types";
import { trpc } from "../../lib/trpc";

type WorkspacePageProps = {
  user: User | null;
};

export default function WorkspacePage({ user }: WorkspacePageProps) {
  const { workspace } = useParams<{ workspace: string }>();
  const stats = trpc.admin.stats.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const { t } = useTranslation();
  const insightItems = t("dashboard.insightItems", {
    returnObjects: true,
  }) as string[];
  const assistantItems = t("dashboard.assistantItems", {
    returnObjects: true,
  }) as string[];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">{t("dashboard.title")}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-300">
          {t("dashboard.welcome")}，{user?.name || user?.email}（{user?.role}）
        </p>
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          当前工作空间: {workspace}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {(t("dashboard.stats", { returnObjects: true }) as string[]).map(
          (title, index) => (
            <div key={title} className="card">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {title}
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {stats.data?.[index] ?? "-"}
              </p>
            </div>
          )
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3">
          <h3 className="text-lg font-semibold">
            {t("dashboard.insightTitle")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {t("dashboard.insightDesc")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {insightItems.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="card space-y-3">
          <h3 className="text-lg font-semibold">
            {t("dashboard.assistantTitle")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {t("dashboard.assistantDesc")}
          </p>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {assistantItems.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
