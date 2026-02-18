import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { SubPhaseProps } from "./types";

const laneStyles = [
  {
    icon: "🌐",
    borderRunning: "border-sky-300 dark:border-sky-800",
    bgProgress: "bg-sky-500",
    spinnerBorder: "border-sky-500",
  },
  {
    icon: "⚡",
    borderRunning: "border-violet-300 dark:border-violet-800",
    bgProgress: "bg-violet-500",
    spinnerBorder: "border-violet-500",
  },
  {
    icon: "🖥️",
    borderRunning: "border-amber-300 dark:border-amber-800",
    bgProgress: "bg-amber-500",
    spinnerBorder: "border-amber-500",
  },
  {
    icon: "🍎",
    borderRunning: "border-slate-300 dark:border-slate-600",
    bgProgress: "bg-slate-500",
    spinnerBorder: "border-slate-500",
  },
  {
    icon: "🤖",
    borderRunning: "border-emerald-300 dark:border-emerald-800",
    bgProgress: "bg-emerald-500",
    spinnerBorder: "border-emerald-500",
  },
];

const statStyles = [
  {
    bg: "bg-slate-100 dark:bg-slate-800/50",
    text: "text-slate-600 dark:text-slate-400",
  },
  {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-600 dark:text-rose-400",
  },
  {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-600 dark:text-sky-400",
  },
];

export const ExecutePhase = ({ subPhase }: SubPhaseProps) => {
  const { t } = useTranslation();
  const lanesData = t("aiWorkflow.execute.lanes", {
    returnObjects: true,
  }) as unknown as { type: string; desc: string }[];
  const statsData = t("aiWorkflow.execute.stats", {
    returnObjects: true,
  }) as unknown as { label: string; value: string }[];

  const lanes = lanesData.map((lane, i) => ({
    ...lane,
    ...laneStyles[i],
    total: [562, 86, 438, 128, 139][i],
  }));

  const stats = statsData.map((stat, i) => ({
    ...stat,
    ...statStyles[i],
  }));

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
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-2xl"
          >
            🚀
          </motion.div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {t("aiWorkflow.execute.title")}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("aiWorkflow.execute.desc")}
            </p>
          </div>
        </div>

        {/* Execution Lanes */}
        <div className="flex-1 space-y-2.5 overflow-y-auto">
          {lanes.map((lane, laneIndex) => {
            const progress = Math.min(
              100,
              Math.max(0, (subPhase - laneIndex) * 20),
            );
            const executed = Math.floor((lane.total * progress) / 100);
            const passed = Math.floor(executed * 0.97);
            const failed = Math.floor(executed * 0.02);
            const running = progress < 100;

            return (
              <motion.div
                key={lane.type}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: laneIndex * 0.15 }}
                className={`rounded-xl border ${running ? lane.borderRunning : "border-emerald-300 dark:border-emerald-800"} bg-white p-2.5 dark:bg-slate-900`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lane.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {lane.type}
                      </span>
                      {running ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                          className={`h-4 w-4 rounded-full border-2 ${lane.spinnerBorder} border-t-transparent`}
                        />
                      ) : (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {lane.desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ✓ {passed}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400">
                      ✗ {failed}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {executed}/{lane.total}
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full ${progress >= 100 ? "bg-emerald-500" : lane.bgProgress}`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Execution Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: subPhase >= 6 ? 1 : 0 }}
          className="mt-2.5 grid grid-cols-4 gap-2.5"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-lg p-2 text-center ${stat.bg}`}
            >
              <p className={`text-lg font-bold ${stat.text}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};
