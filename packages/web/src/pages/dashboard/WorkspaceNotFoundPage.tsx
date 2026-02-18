import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type WorkspaceNotFoundPageProps = {
  workspace?: string;
  fallbackWorkspace?: string;
};

export default function WorkspaceNotFoundPage({
  workspace,
  fallbackWorkspace,
}: WorkspaceNotFoundPageProps) {
  const fallbackLink = fallbackWorkspace
    ? `/dashboard/${fallbackWorkspace}`
    : "/dashboard";
  const { t } = useTranslation();

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="relative max-w-md text-center">
        {/* Decorative elements */}
        <div className="absolute -top-16 -left-16 h-32 w-32 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-3xl dark:from-purple-600/10 dark:to-pink-600/10" />
        <div className="absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 blur-3xl dark:from-blue-600/10 dark:to-cyan-600/10" />

        <div className="relative">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-2xl shadow-purple-500/30">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            {t("pages.workspaceNotFound.title")}
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            {workspace
              ? t("pages.workspaceNotFound.notFoundNamed", { name: workspace })
              : t("pages.workspaceNotFound.notFoundGeneric")}
          </p>

          <Link
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3 font-medium text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-0.5"
            to={fallbackLink}
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
                d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
              />
            </svg>
            {t("pages.workspaceNotFound.goBack")}
          </Link>
        </div>
      </div>
    </div>
  );
}
