import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { WorkspaceRedirectSkeleton } from "../../components/skeleton";
import { trpc } from "../../lib/trpc";

export default function DashboardIndexRedirect() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const workspacesQuery = trpc.workspace.list.useQuery();

  useEffect(() => {
    if (!workspacesQuery.data || workspacesQuery.data.length === 0) return;
    navigate(`/dashboard/${workspacesQuery.data[0].slug}`, { replace: true });
  }, [navigate, workspacesQuery.data]);

  if (workspacesQuery.isLoading) {
    return <WorkspaceRedirectSkeleton />;
  }

  if (workspacesQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="card">
          <h2 className="text-xl font-semibold">{t("dashboard.loadError")}</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-300">
            {t("dashboard.retryLater")}
          </p>
        </div>
      </div>
    );
  }

  if (workspacesQuery.data?.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="card">
          <h2 className="text-xl font-semibold">
            {t("dashboard.noWorkspace")}
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-300">
            {t("dashboard.createFirst")}
          </p>
        </div>
      </div>
    );
  }

  return <WorkspaceRedirectSkeleton />;
}
