import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

export default function DashboardNotFoundPage() {
  const { workspace } = useParams<{ workspace: string }>();
  const backToWorkspace = workspace ? `/dashboard/${workspace}` : "/dashboard";
  const { t } = useTranslation();

  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative max-w-md text-center">
        {/* Decorative elements */}
        <div className="absolute -top-16 -left-16 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-3xl dark:from-blue-600/10 dark:to-indigo-600/10" />
        <div className="absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-400/20 to-teal-400/20 blur-3xl dark:from-cyan-600/10 dark:to-teal-600/10" />

        <div className="relative">
          {/* 404 badge */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/30">
            <span className="text-2xl font-bold text-white">404</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            {t("pages.dashboardNotFound.title")}
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            {t("pages.dashboardNotFound.description")}
          </p>

          <Link
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
            to={backToWorkspace}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {t("pages.dashboardNotFound.goBack")}
          </Link>
        </div>
      </div>
    </div>
  );
}
