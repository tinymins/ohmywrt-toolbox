import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 px-4 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="relative max-w-lg text-center">
        {/* Decorative background elements */}
        <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-br from-red-400/20 to-orange-400/20 blur-3xl dark:from-red-600/10 dark:to-orange-600/10" />
        <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-amber-400/20 to-yellow-400/20 blur-3xl dark:from-amber-600/10 dark:to-yellow-600/10" />

        {/* Main content */}
        <div className="relative">
          {/* 403 illustration */}
          <div className="mb-8 flex items-center justify-center">
            <div className="relative">
              <span className="text-[180px] font-black leading-none text-slate-200 dark:text-slate-800 select-none">
                403
              </span>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-600 shadow-2xl shadow-red-500/30 dark:shadow-red-500/20">
                  <svg
                    className="h-12 w-12 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            {t("pages.unauthorized.title")}
          </h1>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            {t("pages.unauthorized.description")}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 px-6 py-3 font-medium text-white shadow-lg shadow-red-500/30 transition-all hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5"
              to="/"
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
              {t("pages.unauthorized.goHome")}
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              to="/login"
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
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              {t("pages.unauthorized.reLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
