import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import AdminSettingsPage from "@/components/admin/AdminSettingsPage";
import { PAGE_NAMES } from "@/components/dashboard/nav-config";
import { NetworkToolsPage } from "@/components/dashboard/network";
import { ProxySubscribeList } from "@/components/dashboard/proxy";
import GeneralSettingsPage from "@/components/settings/GeneralSettingsPage";

export default function DemoPageRoute() {
  const { t } = useTranslation();
  const { page } = useParams<{ page: string }>();

  if (page === "settings") {
    return <GeneralSettingsPage />;
  }

  if (page === "admin") {
    return <AdminSettingsPage />;
  }

  if (page === "proxy") {
    return <ProxySubscribeList />;
  }

  if (page === "network") {
    return <NetworkToolsPage />;
  }

  const pageName =
    (page && PAGE_NAMES[page]) ?? page ?? t("dashboard.unknownPage");

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
