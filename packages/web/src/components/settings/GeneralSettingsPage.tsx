import { Cog } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function GeneralSettingsPage() {
  const { t } = useTranslation();

  return (
    <div>
      {/* Intro Banner */}
      <div className="mb-5 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 dark:border-emerald-800/30 dark:from-emerald-950/20 dark:to-teal-950/20">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 dark:bg-emerald-500/25">
            <Cog className="text-emerald-600 dark:text-emerald-400" size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
              {t("generalSettings.intro.headline")}
            </h3>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {t("generalSettings.intro.description")}
            </p>
          </div>
        </div>
      </div>

      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
        {t("generalSettings.title")}
      </h1>

      {/* Placeholder for future general settings */}
      <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--border-base)] p-12">
        <p className="text-sm text-[var(--text-muted)]">
          {t("generalSettings.emptyHint")}
        </p>
      </div>
    </div>
  );
}
