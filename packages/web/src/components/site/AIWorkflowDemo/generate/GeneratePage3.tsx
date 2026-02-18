import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const GeneratePage3 = () => {
  const { t } = useTranslation();
  const apis = t("aiWorkflow.generate.apis", {
    returnObjects: true,
  }) as unknown as { method: string; path: string; desc: string }[];
  const apisWithCases = [
    { ...apis[0], cases: 12 },
    { ...apis[1], cases: 8 },
    { ...apis[2], cases: 18 },
    { ...apis[3], cases: 15 },
    { ...apis[4], cases: 6 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 p-4"
    >
      <h4 className="mb-3 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs text-white">
          3
        </span>
        🌐 {t("aiWorkflow.generate.step3")}
      </h4>
      <div className="space-y-2 font-mono text-xs">
        {apisWithCases.map((api, i) => (
          <motion.div
            key={api.path}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
          >
            <span
              className={`rounded px-2 py-1 text-xs font-bold ${
                api.method === "GET"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : api.method === "POST"
                    ? "bg-sky-500/20 text-sky-600 dark:text-sky-400"
                    : api.method === "PUT"
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
              }`}
            >
              {api.method}
            </span>
            <span className="flex-1 text-slate-700 dark:text-slate-300">
              {api.path}
            </span>
            <span className="text-slate-500">{api.desc}</span>
            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-sky-600 dark:text-sky-400">
              {api.cases} {t("aiWorkflow.generate.cases")}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
