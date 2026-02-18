import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const AnalyzingPhase = () => {
  const { t } = useTranslation();
  const modules = t("aiWorkflow.analyzing.modules", {
    returnObjects: true,
  }) as unknown as string[];
  const stats = t("aiWorkflow.analyzing.stats", {
    returnObjects: true,
  }) as unknown as { label: string; value: string }[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute inset-0 p-6"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 text-2xl"
          >
            🤖
          </motion.div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {t("aiWorkflow.analyzing.title")}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("aiWorkflow.analyzing.desc")}
            </p>
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="ml-auto h-6 w-6 rounded-full border-2 border-violet-500 border-t-transparent"
          />
        </div>

        {/* Analysis Content */}
        <div className="flex-1 space-y-4">
          {/* Document Structure */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
              📑 {t("aiWorkflow.analyzing.docStructure")}
            </h4>
            <div className="space-y-2">
              {modules.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.3 }}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                >
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.3 + 0.2 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white"
                  >
                    ✓
                  </motion.span>
                  {item}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: "📦", color: "violet" },
              { icon: "🎯", color: "sky" },
              { icon: "⚠️", color: "amber" },
              { icon: "🔗", color: "emerald" },
            ].map((item, i) => (
              <motion.div
                key={stats[i]?.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 + i * 0.2 }}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="text-xl">{item.icon}</span>
                <p
                  className={`mt-1 text-2xl font-bold text-${item.color}-600 dark:text-${item.color}-400`}
                >
                  {stats[i]?.value}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {stats[i]?.label}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                {t("aiWorkflow.analyzing.progress")}
              </span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-violet-600 dark:text-violet-400"
              >
                {t("aiWorkflow.analyzing.analyzing")}
              </motion.span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3.5, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
