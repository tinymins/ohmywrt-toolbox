import { useTranslation } from "react-i18next";

export default function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
      <p className="text-slate-600 dark:text-slate-300">
        {t("footer.tagline")}
      </p>
      <p className="mt-2">{t("footer.copyright")}</p>
    </footer>
  );
}
