import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const ReportPhase = () => {
  const { t } = useTranslation();
  const metrics = t("aiWorkflow.report.metrics", {
    returnObjects: true,
  }) as unknown as { label: string; value: string }[];
  const chartLabels = t("aiWorkflow.report.chartLabels", {
    returnObjects: true,
  }) as unknown as string[];
  const defects = t("aiWorkflow.report.defects", {
    returnObjects: true,
  }) as unknown as { module: string; count: number; severity: string }[];

  const metricsWithData = [
    { ...metrics[0], icon: "✅", color: "emerald" },
    { ...metrics[1], icon: "📈", color: "sky" },
    { ...metrics[2], icon: "📋", color: "violet" },
    { ...metrics[3], icon: "🐛", color: "rose" },
  ];

  const chartData = [
    { value: 42, color: "bg-sky-500" },
    { value: 32, color: "bg-violet-500" },
    { value: 10, color: "bg-slate-500" },
    { value: 10, color: "bg-emerald-500" },
    { value: 6, color: "bg-amber-500" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute inset-0 p-6"
    >
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 1.5, repeat: 2 }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-2xl shadow-lg"
          >
            📊
          </motion.div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {t("aiWorkflow.report.title")}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("aiWorkflow.report.desc")}
            </p>
          </div>
          <motion.span
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="ml-auto rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-3 py-1 text-xs font-medium text-white"
          >
            🎉 {t("aiWorkflow.report.complete")}
          </motion.span>
        </div>

        {/* Report Content */}
        <div className="grid flex-1 grid-cols-2 gap-4 overflow-hidden">
          {/* Left: Stats & Charts */}
          <div className="space-y-3">
            {/* Key Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-2"
            >
              {metricsWithData.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-xl bg-${stat.color}-50 p-3 dark:bg-${stat.color}-950/30`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{stat.icon}</span>
                    <span
                      className={`text-xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}
                    >
                      {stat.value}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* Chart */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("aiWorkflow.report.chartTitle")}
              </p>
              <div className="flex h-24 items-end gap-2">
                {chartData.map((bar, i) => (
                  <motion.div
                    key={chartLabels[i]}
                    initial={{ height: 0 }}
                    animate={{ height: `${bar.value}%` }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                    className={`flex-1 ${bar.color} rounded-t`}
                  />
                ))}
              </div>
              <div className="mt-1 flex gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                {chartLabels.map((label) => (
                  <span key={label} className="flex-1 text-center">
                    {label}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Defect Summary */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/30"
            >
              <p className="mb-2 text-xs font-medium text-rose-700 dark:text-rose-400">
                🐛 {t("aiWorkflow.report.defectTitle")}
              </p>
              <div className="space-y-1.5">
                {defects.map((defect) => (
                  <div
                    key={defect.module}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-600 dark:text-slate-400">
                      {defect.module}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 ${defect.severity === t("common.severity.high") ? "bg-rose-500 text-white" : defect.severity === t("common.severity.medium") ? "bg-amber-500 text-white" : "bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-300"}`}
                      >
                        {defect.severity}
                      </span>
                      <span className="font-medium text-rose-600 dark:text-rose-400">
                        {defect.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Video/Screenshot Preview */}
          <div className="space-y-3">
            {/* Browser Screenshot */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
            >
              <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-800 px-3 py-2">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[10px] text-slate-400">
                  {t("aiWorkflow.report.browserRecording")}
                </span>
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                  className="ml-auto flex items-center gap-1 text-[10px] text-rose-400"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  REC
                </motion.span>
              </div>
              <div className="relative h-32 bg-gradient-to-br from-slate-800 to-slate-900 p-3">
                {/* Simulated browser content */}
                <div className="h-full rounded bg-slate-100 p-2 dark:bg-slate-700">
                  <div className="mb-2 h-2 w-20 rounded bg-slate-300 dark:bg-slate-600" />
                  <div className="flex gap-2">
                    <div className="h-16 w-16 rounded bg-slate-200 dark:bg-slate-600" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2 w-full rounded bg-slate-300 dark:bg-slate-600" />
                      <div className="h-2 w-3/4 rounded bg-slate-300 dark:bg-slate-600" />
                      <div className="h-2 w-1/2 rounded bg-emerald-400" />
                    </div>
                  </div>
                </div>
                {/* Click indicator */}
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                  className="absolute bottom-4 right-8 h-4 w-4 rounded-full border-2 border-sky-500 bg-sky-500/30"
                />
              </div>
            </motion.div>

            {/* Mobile Screenshot */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3"
            >
              {/* iPhone */}
              <div className="flex-1 overflow-hidden rounded-2xl border-4 border-slate-800 bg-slate-900">
                <div className="flex h-4 items-center justify-center bg-slate-800">
                  <div className="h-1.5 w-12 rounded-full bg-slate-700" />
                </div>
                <div className="h-28 bg-gradient-to-b from-slate-100 to-slate-200 p-2 dark:from-slate-700 dark:to-slate-800">
                  <div className="mb-1 h-1.5 w-12 rounded bg-slate-300 dark:bg-slate-600" />
                  <div className="mb-2 grid grid-cols-2 gap-1">
                    <div className="h-8 rounded bg-sky-200 dark:bg-sky-600" />
                    <div className="h-8 rounded bg-violet-200 dark:bg-violet-600" />
                  </div>
                  <div className="h-6 rounded-lg bg-emerald-500" />
                </div>
              </div>

              {/* Android */}
              <div className="flex-1 overflow-hidden rounded-xl border-4 border-slate-800 bg-slate-900">
                <div className="flex h-3 items-center justify-center gap-4 bg-slate-800">
                  <div className="h-0.5 w-4 rounded bg-slate-600" />
                  <div className="h-1 w-1 rounded-full bg-slate-600" />
                </div>
                <div className="h-28 bg-gradient-to-b from-slate-100 to-slate-200 p-2 dark:from-slate-700 dark:to-slate-800">
                  <div className="mb-1 h-1.5 w-16 rounded bg-slate-300 dark:bg-slate-600" />
                  <div className="mb-2 space-y-1">
                    <div className="h-6 rounded bg-amber-200 dark:bg-amber-600" />
                    <div className="h-6 rounded bg-emerald-200 dark:bg-emerald-600" />
                  </div>
                  <div className="h-5 rounded-lg bg-violet-500" />
                </div>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex gap-2"
            >
              <button
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 py-2.5 text-sm font-medium text-white shadow-lg"
                type="button"
              >
                📥 {t("aiWorkflow.report.downloadReport")}
              </button>
              <button
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                type="button"
              >
                📤 {t("aiWorkflow.report.shareReport")}
              </button>
            </motion.div>

            {/* Summary */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-3 text-center text-white"
            >
              <p className="text-sm font-medium">
                ✨ {t("aiWorkflow.report.timeSaved")}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
