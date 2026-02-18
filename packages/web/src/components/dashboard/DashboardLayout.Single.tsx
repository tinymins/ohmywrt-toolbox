import { useTranslation } from "react-i18next";
import { trpc } from "../../lib/trpc";
import DashboardLayoutBase from "./DashboardLayoutBase";
import type { DashboardLayoutProps } from "./types";

export function Single(props: DashboardLayoutProps) {
  const { t } = useTranslation();

  // 需要获取 shared 工作空间的 ID
  const workspacesQuery = trpc.workspace.list.useQuery();

  const brandHeader = (
    <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-4">
      <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
        {t("brand")}
      </div>
    </div>
  );

  return (
    <DashboardLayoutBase
      {...props}
      basePath="/dashboard"
      sidebarHeader={brandHeader}
      mobileDrawerHeader={brandHeader}
      isWorkspaceLoading={workspacesQuery.isLoading}
    />
  );
}
