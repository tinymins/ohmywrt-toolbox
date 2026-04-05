import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { WorkspaceRedirectSkeleton } from "@/components/skeleton";
import { useSystemSettings, useWorkspaceList } from "@/hooks";

export default function DashboardIndexRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaces, isLoading } = useWorkspaceList();
  const { singleWorkspaceMode } = useSystemSettings();

  useEffect(() => {
    if (isLoading) return;
    if (singleWorkspaceMode) return;

    if (!workspaces || workspaces.length === 0) return;
    navigate(`/dashboard/${workspaces[0].slug}`, { replace: true });
  }, [navigate, workspaces, isLoading, singleWorkspaceMode]);

  // Single workspace mode: render the full dashboard layout at /dashboard
  if (singleWorkspaceMode) {
    return <DashboardLayout />;
  }

  if (isLoading) {
    return <WorkspaceRedirectSkeleton />;
  }

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="card">
          <h2 className="text-xl font-semibold">{t("workspace.empty")}</h2>
          <p className="mt-2 text-[var(--text-muted)]">
            {t("workspace.createFirst")}
          </p>
        </div>
      </div>
    );
  }

  return <WorkspaceRedirectSkeleton />;
}
