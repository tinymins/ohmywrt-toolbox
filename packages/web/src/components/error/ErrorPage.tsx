import { useTranslation } from "react-i18next";
import { Link } from "react-router";

// Center icon path keyed by variant
const ICON_PATH: Record<"primary" | "danger", string> = {
  primary:
    "M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  danger:
    "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
};

interface ErrorPageProps {
  code: string;
  title: string;
  description: string;
  /** "primary" = 404 blue palette; "danger" = 403 red palette */
  variant: "primary" | "danger";
  secondaryLabel: string;
  /** If provided, secondary button is a Link; otherwise uses window.history.back() */
  secondaryTo?: string;
  /** Override primary button destination (default: "/") */
  primaryTo?: string;
}

export default function ErrorPage({
  code,
  title,
  description,
  variant,
  secondaryLabel,
  secondaryTo,
  primaryTo = "/",
}: ErrorPageProps) {
  const { t } = useTranslation();
  const primaryLabel = t("common.backToHome");
  const iconPath = ICON_PATH[variant];
  const isPrimary = variant === "primary";
  const glowBg = isPrimary ? "var(--accent-subtle)" : "var(--accent)";
  const glowOpacity = isPrimary ? "opacity-40" : "opacity-10";
  const iconBg = isPrimary ? "bg-[var(--accent)]" : "bg-[var(--accent)]";
  const primaryBtnClass = isPrimary
    ? "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[white]"
    : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[white]";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4 text-[var(--text-primary)]">
      <div className="relative max-w-lg text-center">
        <div
          className={`absolute -top-20 -left-20 h-40 w-40 rounded-full blur-3xl ${glowOpacity}`}
          style={{ backgroundColor: glowBg }}
        />
        <div
          className={`absolute -bottom-20 -right-20 h-40 w-40 rounded-full blur-3xl ${glowOpacity}`}
          style={{ backgroundColor: glowBg }}
        />

        <div className="relative">
          <div className="mb-8 flex items-center justify-center">
            <div className="relative">
              <span className="text-[180px] font-black leading-none text-[var(--bg-elevated)] select-none">
                {code}
              </span>
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={`flex h-24 w-24 items-center justify-center rounded-full shadow-lg ${iconBg}`}
                >
                  <svg
                    aria-hidden="true"
                    className="h-12 w-12 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={iconPath}
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {title}
          </h1>
          <p className="mt-3 text-[var(--text-muted)]">{description}</p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to={primaryTo}
              className={`inline-flex items-center gap-2 rounded-md px-5 py-2.5 font-medium transition-colors ${primaryBtnClass}`}
            >
              <svg
                aria-hidden="true"
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
              {primaryLabel}
            </Link>
            {secondaryTo ? (
              <Link
                to={secondaryTo}
                className="cursor-pointer inline-flex items-center gap-2 rounded-md border bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] border-[var(--glass-border)] px-5 py-2.5 font-medium text-[var(--text-primary)] transition-colors"
              >
                <svg
                  aria-hidden="true"
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
                {secondaryLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => window.history.back()}
                className="cursor-pointer inline-flex items-center gap-2 rounded-md border bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] border-[var(--glass-border)] px-5 py-2.5 font-medium text-[var(--text-primary)] transition-colors"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                {secondaryLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
