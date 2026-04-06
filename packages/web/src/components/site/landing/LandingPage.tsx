import { Dropdown } from "@acme/components";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { UserMenu } from "@/components/account";
import { userApi } from "@/generated/rust-api";
import { useAuth, useLang, useTheme } from "@/hooks";
import type { Lang } from "@/lib/preferences";

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: "🔗",
    titleKey: "features.trpc.title",
    descKey: "features.trpc.desc",
  },
  {
    icon: "⚡",
    titleKey: "features.ssr.title",
    descKey: "features.ssr.desc",
  },
  {
    icon: "🗄️",
    titleKey: "features.db.title",
    descKey: "features.db.desc",
  },
  {
    icon: "🏗️",
    titleKey: "features.backend.title",
    descKey: "features.backend.desc",
  },
  {
    icon: "🎨",
    titleKey: "features.tailwind.title",
    descKey: "features.tailwind.desc",
  },
  {
    icon: "📦",
    titleKey: "features.workspace.title",
    descKey: "features.workspace.desc",
  },
] as const;

export default function LandingPage() {
  const { t } = useTranslation();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { user, isAuthed, updateUser, logout } = useAuth();
  const { langMode, setLangMode } = useLang();

  const updateProfile = userApi.updateProfile.useMutation({
    onSuccess: updateUser,
  });

  const isDark = theme === "dark";

  const toggleTheme = () => {
    const newMode =
      themeMode === "dark" || (themeMode === "auto" && theme === "dark")
        ? "light"
        : "dark";
    setThemeMode(newMode);
    if (isAuthed) {
      updateProfile.mutate({ settings: { themeMode: newMode } });
    }
  };

  const LANG_NATIVE_NAMES: Record<Lang, string> = {
    "zh-CN": "简体中文",
    "en-US": "English",
    "de-DE": "Deutsch",
    "ja-JP": "日本語",
    "zh-TW": "繁體中文",
  };

  const langKeys: Lang[] = ["zh-CN", "en-US", "de-DE", "ja-JP", "zh-TW"];

  const langMenuItems = [
    {
      key: "auto",
      label: (
        <span className="flex items-center justify-between w-full">
          <span>{t("common.auto")}</span>
          {langMode === "auto" && (
            <Check className="w-3.5 h-3.5 ml-4 text-blue-500 dark:text-blue-400" />
          )}
        </span>
      ),
      onClick: () => {
        setLangMode("auto");
        if (isAuthed) {
          updateProfile.mutate({ settings: { langMode: "auto" } });
        }
      },
    },
    ...langKeys.map((key) => ({
      key,
      label: (
        <span className="flex items-center justify-between w-full">
          <span>{LANG_NATIVE_NAMES[key]}</span>
          {langMode === key && (
            <Check className="w-3.5 h-3.5 ml-4 text-blue-500 dark:text-blue-400" />
          )}
        </span>
      ),
      onClick: () => {
        setLangMode(key);
        if (isAuthed) {
          updateProfile.mutate({ settings: { langMode: key } });
        }
      },
    })),
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-elevated)] text-[var(--text-primary)]">
      {/* Header */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/75 dark:bg-zinc-900/75 border-b border-zinc-200/60 dark:border-zinc-800/60 pt-[env(safe-area-inset-top,0px)]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2 text-xl font-bold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-black shadow-sm">
                A
              </span>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                OhMyWRT Toolbox
              </span>
            </motion.button>

            <div className="flex items-center gap-2">
              <Dropdown
                menu={{ items: langMenuItems }}
                trigger={["click"]}
                placement="bottom-end"
              >
                <button
                  type="button"
                  className="flex items-center px-2.5 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors"
                  title={t("common.language")}
                >
                  <GlobeIcon />
                </button>
              </Dropdown>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors"
                title={t("common.theme")}
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>

              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="hidden sm:flex items-center px-4 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm transition-all whitespace-nowrap"
                  >
                    {t("nav.dashboard")}
                  </Link>
                  <UserMenu
                    user={user}
                    onUpdateUser={updateUser}
                    onLogout={logout}
                    showDashboardLink
                  />
                </>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:flex items-center px-4 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm transition-all"
                >
                  {t("nav.getStarted")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent dark:from-blue-500/10" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                {t("hero.title")}
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={user ? "/dashboard" : "/register"}
                className="px-8 py-3 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all"
              >
                {t("hero.cta")}
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 text-base font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl transition-all"
              >
                {t("hero.secondary")}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold">
              {t("features.heading")}
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
              {t("features.subheading")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="card hover:border-blue-500/30 dark:hover:border-blue-400/30 transition-colors"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {t(feature.descKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-12 pb-[max(3rem,env(safe-area-inset-bottom,0px))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            {t("footer.copyright")}
          </p>
        </div>
      </footer>
    </div>
  );
}
