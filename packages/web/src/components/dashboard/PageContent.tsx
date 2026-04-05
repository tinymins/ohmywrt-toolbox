import { useTranslation } from "react-i18next";
import AdminSettingsPage from "@/components/admin/AdminSettingsPage";
import { PAGE_NAMES } from "@/components/dashboard/nav-config";
import GeneralSettingsPage from "@/components/settings/GeneralSettingsPage";
import WorkspaceOverview from "./WorkspaceOverview";

export default function PageContent({ page }: { page?: string }) {
  const { t } = useTranslation();

  if (!page) return <WorkspaceOverview />;
  if (page === "settings") return <GeneralSettingsPage />;
  if (page === "admin") return <AdminSettingsPage />;

  const pageName = PAGE_NAMES[page] ?? page ?? t("dashboard.unknownPage");

  return (
    <div className="flex h-full items-center justify-center p-8">
      <p className="text-2xl font-medium text-[var(--text-muted)]">
        {t("dashboard.switchedTo")}&nbsp;
        <span className="text-[var(--text-primary)] font-semibold">
          {pageName}
        </span>
      </p>
    </div>
  );
}
