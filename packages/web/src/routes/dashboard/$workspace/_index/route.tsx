import { useTranslation } from "react-i18next";
import { useAuth, useWorkspace } from "@/hooks";

export default function WorkspaceRoute() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const workspace = useWorkspace();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        {t("workspace.welcomeBack", { name: user?.name || user?.email || "" })}
      </h1>
      <p className="text-[var(--text-secondary)] mb-8">{workspace.name}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass glass-accent p-5">
          <p className="text-xs text-[var(--text-muted)] mb-1">
            {t("workspace.placeholder")}
          </p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">—</p>
        </div>
        <div className="glass glass-accent p-5">
          <p className="text-xs text-[var(--text-muted)] mb-1">
            {t("workspace.userLabel")}
          </p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {user?.name || "—"}
          </p>
        </div>
        <div className="glass glass-accent p-5">
          <p className="text-xs text-[var(--text-muted)] mb-1">
            {t("workspace.currentWorkspace")}
          </p>
          <p className="text-lg font-semibold text-[var(--accent-text)]">
            /{workspace.slug}
          </p>
        </div>
      </div>
    </div>
  );
}
